const Listing = require('../models/listing');
const Booking = require('../models/Booking');
const razorpay = require('../config/razorpay');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const generateBookingPDF = require('../utils/pdfGenerator'); // ✅ your custom pdf generator

// Setup nodemailer transporter
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASS
    }
});

// ======================
// Book Listing & Create Razorpay Order
// ======================
exports.bookListing = async (req, res) => {
    const { id } = req.params;
    const { checkIn, checkOut } = req.body;

    try {
        const listing = await Listing.findById(id);
        if (!listing) {
            req.flash('error', 'Listing not found');
            return res.redirect('/listings');
        }

        const days = (new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24);
        if (days <= 0) {
            req.flash('error', 'Check-out must be after check-in.');
            return res.redirect(`/listings/${id}`);
        }

        const totalAmount = listing.price * days * 100; // in paise

        // Create razorpay order
        const order = await razorpay.orders.create({
            amount: totalAmount,
            currency: 'INR',
            receipt: `receipt_${Date.now()}`
        });

        // Save booking in DB
        const booking = new Booking({
            listing: id,
            user: req.user._id,
            checkIn,
            checkOut,
            totalAmount: totalAmount / 100,
            razorpayOrderId: order.id
        });

        await booking.save();
        await booking.populate('user');

        res.render('listings/payment', {
            order,
            booking,
            key_id: process.env.RAZORPAY_KEY_ID
        });

    } catch (err) {
        console.error("🚨 Error during booking:", err.stack || err);
        req.flash('error', 'Something went wrong while processing your booking.');
        res.redirect(`/listings/${id}`);
    }
};

// ======================
// Verify Razorpay Payment, generate PDF & send email
// ======================
exports.verifyPayment = async (req, res) => {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, bookingId } = req.body;

    // Validate signature
    const body = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_SECRET)
        .update(body)
        .digest('hex');

    if (expectedSignature !== razorpay_signature) {
        console.warn("⚠ Invalid Razorpay signature detected!");
        return res.status(400).json({ success: false, error: 'Invalid signature.' });
    }

    try {
        const booking = await Booking.findById(bookingId).populate('listing user');
        if (!booking || !booking.user.equals(req.user._id)) {
            return res.status(403).json({ success: false, error: 'Unauthorized or invalid booking.' });
        }

        // Mark as paid
        booking.paymentStatus = 'paid';
        booking.razorpayPaymentId = razorpay_payment_id;
        await booking.save();

        // ✅ Generate PDF invoice
        const pdfBuffer = await generateBookingPDF(booking);

        // ✅ Send confirmation email with PDF
        const mailOptions = {
            from: `"Airbnb Clone" <${process.env.GMAIL_USER}>`,
            to: booking.user.email,
            subject: `Booking Confirmed for ${booking.listing.title}`,
            html: `
                <h2>Hi ${booking.user.username},</h2>
                <p>Your booking for <strong>${booking.listing.title}</strong> is confirmed!</p>
                <ul>
                    <li>Check-in: ${new Date(booking.checkIn).toLocaleDateString()}</li>
                    <li>Check-out: ${new Date(booking.checkOut).toLocaleDateString()}</li>
                    <li>Total Amount: ₹${booking.totalAmount}</li>
                </ul>
                <p>Your invoice is attached as a PDF.</p>
                <br>
                <small>Thank you for booking with us.</small>
            `,
            attachments: [
                {
                    filename: `Booking-${booking._id}.pdf`,
                    content: pdfBuffer,
                    contentType: 'application/pdf'
                }
            ]
        };

        await transporter.sendMail(mailOptions);
        console.log(`✅ Confirmation email with PDF sent to: ${booking.user.email}`);

        return res.json({ success: true, redirect: `/bookings/${bookingId}/success` });

    } catch (err) {
        console.error("🚨 Payment verification or email error:", err.stack || err);
        return res.status(500).json({ success: false, error: 'Server error.' });
    }
};

// ======================
// Show Booking Success Page
// ======================
exports.bookingSuccess = async (req, res) => {
    const { bookingId } = req.params;
    try {
        const booking = await Booking.findById(bookingId).populate('listing');
        if (!booking || !booking.user.equals(req.user._id)) {
            return res.status(403).send("Unauthorized or invalid booking.");
        }

        if (booking.paymentStatus !== 'paid') {
            booking.paymentStatus = 'paid';
            await booking.save();
        }

        res.render('listings/success', { booking });

    } catch (err) {
        console.error("🚨 Booking success page error:", err.stack || err);
        res.status(500).send("Server error.");
    }
};
