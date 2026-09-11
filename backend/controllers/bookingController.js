const Listing = require("../models/listing");
const Booking = require("../models/Booking");
const razorpay = require("../config/razorpay");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const generateBookingPDF = require("../utils/pdfGenerator");

/**
 * Nodemailer transporter configured to send emails via Gmail.
 *
 * Credentials are loaded from environment variables:
 *  - GMAIL_USER: The Gmail address used as the sender
 *  - GMAIL_PASS: An app-specific password (not the account password)
 *
 * @type {import("nodemailer").Transporter}
 */
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASS,
    },
});

// ─── Book Listing ─────────────────────────────────────────────────────────────

/**
 * Controller: Initiates the booking flow for a listing.
 *
 * Validates the date range, calculates the total cost, creates a Razorpay order,
 * saves a pending Booking document, and renders the payment page with order
 * details needed by the Razorpay checkout SDK on the frontend.
 *
 * @async
 * @param {import("express").Request}  req - Params: { id }; Body: { checkIn, checkOut }
 * @param {import("express").Response} res
 */
exports.bookListing = async (req, res) => {
    const { id } = req.params;
    const { checkIn, checkOut } = req.body;

    try {
        const listing = await Listing.findById(id);
        if (!listing) {
            req.flash("error", "Listing not found.");
            return res.redirect("/listings");
        }

        // Calculate the number of nights between check-in and check-out
        const days =
            (new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24);

        if (days <= 0) {
            req.flash("error", "Check-out date must be after check-in date.");
            return res.redirect(`/listings/${id}`);
        }

        // ── Overlap check ────────────────────────────────────────────────────
        // Reject if there is already a paid booking for this listing whose
        // date range overlaps the requested range.
        //
        // Two ranges [A,B) and [C,D) overlap when A < D AND C < B.
        // We also exclude cancelled bookings — they are treated as free slots.
        const overlapping = await Booking.findOne({
            listing: id,
            paymentStatus: "paid",
            checkIn: { $lt: new Date(checkOut) },
            checkOut: { $gt: new Date(checkIn) },
        });

        if (overlapping) {
            req.flash(
                "error",
                "These dates are already booked. Please choose different dates."
            );
            return res.redirect(`/listings/${id}`);
        }

        // Razorpay requires the amount in the smallest currency unit (paise for INR)
        const totalAmountPaise = listing.price * days * 100;

        // Create a Razorpay order — this does NOT charge the user yet
        const order = await razorpay.orders.create({
            amount: totalAmountPaise,
            currency: "INR",
            receipt: `receipt_${Date.now()}`,
        });

        // Save a pending booking; it will be marked "paid" after signature verification
        const booking = new Booking({
            listing: id,
            user: req.user._id,
            checkIn,
            checkOut,
            totalAmount: totalAmountPaise / 100, // Store in rupees for display
            razorpayOrderId: order.id,
        });

        await booking.save();

        // Populate the user so the payment view can display the username
        await booking.populate("user");

        res.render("listings/payment", {
            order,
            booking,
            key_id: process.env.RAZORPAY_KEY_ID,
        });
    } catch (err) {
        console.error("Error during booking creation:", err.stack || err);
        req.flash("error", "Something went wrong while processing your booking.");
        res.redirect(`/listings/${id}`);
    }
};

// ─── Verify Payment ───────────────────────────────────────────────────────────

/**
 * Controller: Verifies the Razorpay payment signature and confirms the booking.
 *
 * The client sends back the Razorpay payment response after the user completes
 * payment. This controller:
 *  1. Computes the expected HMAC-SHA256 signature using the Razorpay secret.
 *  2. Compares it against the signature sent by Razorpay (constant-time comparison).
 *  3. If valid, marks the booking as "paid" and stores the payment ID.
 *  4. Generates a PDF invoice and emails it to the user.
 *
 * @async
 * @param {import("express").Request}  req - Body: { razorpay_order_id, razorpay_payment_id, razorpay_signature, bookingId }
 * @param {import("express").Response} res - Returns JSON: { success, redirect } or { success, error }
 */
exports.verifyPayment = async (req, res) => {
    const {
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
        bookingId,
    } = req.body;

    // Compute the expected HMAC-SHA256 signature to verify payment authenticity
    const body = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSignature = crypto
        .createHmac("sha256", process.env.RAZORPAY_SECRET)
        .update(body)
        .digest("hex");

    // Reject if signature doesn't match — this prevents fake payment confirmations
    if (expectedSignature !== razorpay_signature) {
        console.warn("Invalid Razorpay signature detected for order:", razorpay_order_id);
        return res
            .status(400)
            .json({ success: false, error: "Invalid payment signature." });
    }

    try {
        const booking = await Booking.findById(bookingId).populate(
            "listing user"
        );

        if (!booking) {
            return res
                .status(404)
                .json({ success: false, error: "Booking not found." });
        }

        // BUG FIX: `booking.user` is a populated User object (not an ObjectId),
        // so `.equals()` must be called on `booking.user._id` (the ObjectId),
        // not on `booking.user` itself. Calling equals() on the full object
        // would always return false, allowing any logged-in user to verify
        // any booking — a serious authorization bypass.
        if (!booking.user._id.equals(req.user._id)) {
            return res
                .status(403)
                .json({ success: false, error: "Unauthorized." });
        }

        // Mark the booking as paid and record the Razorpay payment ID
        booking.paymentStatus = "paid";
        booking.razorpayPaymentId = razorpay_payment_id;
        await booking.save();

        // Generate the PDF invoice using Puppeteer
        const pdfBuffer = await generateBookingPDF(booking);

        // Send confirmation email with the PDF invoice attached
        const mailOptions = {
            from: `"Wanderlust" <${process.env.GMAIL_USER}>`,
            to: booking.user.email,
            subject: `Booking Confirmed — ${booking.listing.title}`,
            html: `
                <h2>Hi ${booking.user.username},</h2>
                <p>Your booking for <strong>${booking.listing.title}</strong> is confirmed!</p>
                <ul>
                    <li>Check-in:  ${new Date(booking.checkIn).toLocaleDateString()}</li>
                    <li>Check-out: ${new Date(booking.checkOut).toLocaleDateString()}</li>
                    <li>Total Amount: ₹${booking.totalAmount}</li>
                </ul>
                <p>Your invoice is attached as a PDF.</p>
                <br>
                <small>Thank you for booking with Wanderlust.</small>
            `,
            attachments: [
                {
                    filename: `Booking-${booking._id}.pdf`,
                    content: pdfBuffer,
                    contentType: "application/pdf",
                },
            ],
        };

        await transporter.sendMail(mailOptions);
        console.log(`Confirmation email sent to: ${booking.user.email}`);

        return res.json({
            success: true,
            redirect: `/bookings/${bookingId}/success`,
        });
    } catch (err) {
        console.error(
            "Payment verification or email error:",
            err.stack || err
        );
        return res
            .status(500)
            .json({ success: false, error: "Server error during verification." });
    }
};

// ─── Booking Success Page ─────────────────────────────────────────────────────

/**
 * Controller: Renders the booking success/confirmation page.
 *
 * Fetches the booking by ID, verifies the requesting user is the booking owner,
 * and renders the success view with booking details.
 *
 * Note: This controller does NOT update paymentStatus — that is handled
 * exclusively by verifyPayment after signature verification. Reading the status
 * here without verification would allow spoofing.
 *
 * @async
 * @param {import("express").Request}  req - Params: { bookingId }
 * @param {import("express").Response} res
 */
exports.bookingSuccess = async (req, res) => {
    const { bookingId } = req.params;

    try {
        const booking = await Booking.findById(bookingId).populate("listing");

        if (!booking) {
            req.flash("error", "Booking not found.");
            return res.redirect("/listings");
        }

        // BUG FIX: booking.user is NOT populated here, so it's still an ObjectId —
        // .equals() is safe to call directly on it.
        if (!booking.user.equals(req.user._id)) {
            return res.status(403).send("Unauthorized access to booking.");
        }

        // BUG FIX: Removed the redundant paymentStatus = 'paid' assignment.
        // The success page should only DISPLAY the booking; it must not change
        // payment state. Marking as paid here (without signature verification)
        // would allow anyone to navigate directly to this URL and fake a
        // successful payment for a "pending" booking.

        res.render("listings/success", { booking });
    } catch (err) {
        console.error("Booking success page error:", err.stack || err);
        res.status(500).send("Server error.");
    }
};

// ─── Cancel Booking ───────────────────────────────────────────────────────────

/**
 * Controller: Cancels a paid booking and issues a Razorpay refund.
 *
 * Rules enforced:
 *  - The requesting user must be the booking owner.
 *  - Cancellation is only allowed more than 24 hours before check-in.
 *  - Only bookings with paymentStatus "paid" can be cancelled.
 *
 * On success the booking's paymentStatus is set to "cancelled" and a full
 * refund is triggered via razorpay.payments.refund (amount in paise).
 *
 * @async
 * @param {import("express").Request}  req - Params: { id } (booking ID)
 * @param {import("express").Response} res
 */
exports.cancelBooking = async (req, res) => {
    const { id } = req.params;

    try {
        const booking = await Booking.findById(id);

        if (!booking) {
            req.flash("error", "Booking not found.");
            return res.redirect("/listings");
        }

        // Owner-only: the logged-in user must be the booking's owner
        if (!booking.user.equals(req.user._id)) {
            req.flash("error", "You are not authorised to cancel this booking.");
            return res.redirect("/listings");
        }

        // Only paid bookings can be cancelled
        if (booking.paymentStatus !== "paid") {
            req.flash("error", "Only confirmed (paid) bookings can be cancelled.");
            return res.redirect("/listings");
        }

        // Enforce 24-hour cutoff before check-in
        const hoursUntilCheckIn =
            (new Date(booking.checkIn) - Date.now()) / (1000 * 60 * 60);

        if (hoursUntilCheckIn <= 24) {
            req.flash(
                "error",
                "Cancellations are only allowed more than 24 hours before check-in."
            );
            return res.redirect("/listings");
        }

        // Issue the Razorpay refund (amount in paise = totalAmount * 100)
        await razorpay.payments.refund(booking.razorpayPaymentId, {
            amount: booking.totalAmount * 100,
        });

        // Mark the booking as cancelled
        booking.paymentStatus = "cancelled";
        await booking.save();

        req.flash("success", "Your booking has been cancelled and a refund has been initiated.");
        return res.redirect("/listings");
    } catch (err) {
        console.error("Booking cancellation error:", err.stack || err);
        req.flash("error", "Something went wrong while cancelling your booking.");
        return res.redirect("/listings");
    }
};
