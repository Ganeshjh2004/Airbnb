const Booking = require("../../models/Booking");
const Listing = require("../../models/listing");
const bookingService = require("../../services/bookingService");

/**
 * GET /api/bookings
 * Returns all bookings for the authenticated user.
 */
module.exports.getUserBookings = async (req, res) => {
    try {
        const bookings = await Booking.find({ user: req.user._id })
            .populate("listing")
            .sort({ createdAt: -1 });
        return res.json(bookings);
    } catch (err) {
        console.error("API getUserBookings error:", err);
        return res.status(500).json({ error: "Failed to fetch bookings." });
    }
};

/**
 * POST /api/bookings
 * Initiates a new booking, validates overlap, and creates a Razorpay order.
 */
module.exports.createBooking = async (req, res) => {
    const { listingId, checkIn, checkOut } = req.body;
    const targetId = listingId || req.body.listing;

    if (!targetId) {
        return res.status(400).json({ error: "Listing ID is required." });
    }

    try {
        const listing = await Listing.findById(targetId);
        if (!listing) {
            return res.status(404).json({ error: "Listing not found." });
        }

        const { booking, order } = await bookingService.createBookingWithOrder({
            listing,
            userId: req.user._id,
            checkIn,
            checkOut,
        });

        await booking.populate("listing");

        return res.status(201).json({
            success: true,
            booking,
            order,
            key_id: process.env.RAZORPAY_KEY_ID,
        });
    } catch (err) {
        console.error("API createBooking error:", err);
        const statusCode = err.statusCode || 500;
        return res
            .status(statusCode)
            .json({ error: err.message || "Failed to create booking." });
    }
};

/**
 * POST /api/bookings/:id/cancel
 * Cancels a paid booking and triggers a Razorpay refund.
 */
module.exports.cancelBooking = async (req, res) => {
    const { id } = req.params;

    try {
        const booking = await bookingService.cancelAndRefundBooking(
            id,
            req.user._id
        );
        return res.json({
            success: true,
            message:
                "Your booking has been cancelled and a refund has been initiated.",
            booking,
        });
    } catch (err) {
        console.error("API cancelBooking error:", err);
        const statusCode = err.statusCode || 500;
        return res
            .status(statusCode)
            .json({ error: err.message || "Failed to cancel booking." });
    }
};
