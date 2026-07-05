const express = require("express");
const router = express.Router();
const bookingController = require("../controllers/bookingController");
const Booking = require("../models/Booking");
const generateBookingPDF = require("../utils/pdfGenerator");

/**
 * Import the shared isLoggedIn middleware from middleware.js.
 *
 * BUG FIX: This file previously defined its own inline isLoggedIn function,
 * duplicating the one in middleware.js but with slightly different behaviour
 * (no flash message, no session redirect URL save). Using the shared version
 * ensures consistent auth behaviour and a single source of truth.
 */
const { isLoggedIn } = require("../middleware.js");

// ─── Booking Routes ───────────────────────────────────────────────────────────

/**
 * POST /listings/:id/book
 * Initiates a booking for a listing: validates dates, creates a Razorpay order,
 * saves a pending Booking, and renders the payment page.
 * Requires the user to be logged in.
 */
router.post("/listings/:id/book", isLoggedIn, bookingController.bookListing);

/**
 * POST /verify-payment
 * Verifies the Razorpay payment signature, marks the booking as paid,
 * generates a PDF invoice, and sends a confirmation email.
 * Expects JSON body: { razorpay_order_id, razorpay_payment_id, razorpay_signature, bookingId }
 */
router.post("/verify-payment", isLoggedIn, bookingController.verifyPayment);

/**
 * GET /bookings/:bookingId/success
 * Renders the booking confirmation page after a successful payment.
 * Only the booking's owner can view this page.
 */
router.get(
    "/bookings/:bookingId/success",
    isLoggedIn,
    bookingController.bookingSuccess
);

// ─── Invoice Download Route ───────────────────────────────────────────────────

/**
 * GET /bookings/:id/invoice.pdf
 * Generates and streams a PDF invoice for the specified booking.
 *
 * BUG FIX: Previously duplicated all PDF generation logic (ejs, puppeteer, path)
 * inline in this route. Refactored to use the shared generateBookingPDF utility
 * to avoid code duplication and ensure consistent PDF output.
 *
 * Only the booking's owner can download the invoice.
 */
router.get("/bookings/:id/invoice.pdf", isLoggedIn, async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.id)
            .populate("user")
            .populate("listing");

        if (!booking) {
            return res.status(404).send("Booking not found.");
        }

        // Authorization: only the booking's owner can download the invoice
        if (!booking.user._id.equals(req.user._id)) {
            return res.status(403).send("Unauthorized.");
        }

        // Delegate PDF generation to the shared utility
        const pdfBuffer = await generateBookingPDF(booking);

        res.set({
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename=booking-${booking._id}.pdf`,
        });

        res.send(pdfBuffer);
    } catch (err) {
        console.error("Error generating PDF invoice:", err);
        res.status(500).send("Something went wrong generating the invoice.");
    }
});

module.exports = router;
