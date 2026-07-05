const mongoose = require("mongoose");

/**
 * Mongoose schema for a Booking.
 *
 * Created when a user initiates a booking for a Listing. A Razorpay order is
 * created at the same time, and the booking's paymentStatus is updated to
 * "paid" once the server successfully verifies the Razorpay payment signature.
 *
 * A PDF invoice is generated and emailed to the user after payment confirmation.
 *
 * @typedef {Object} Booking
 * @property {mongoose.Types.ObjectId} listing          - The booked Listing.
 * @property {mongoose.Types.ObjectId} user             - The User who made the booking.
 * @property {Date}                    checkIn           - Check-in date.
 * @property {Date}                    checkOut          - Check-out date.
 * @property {number}                  totalAmount       - Total cost in the base currency unit (e.g. INR).
 * @property {"pending"|"paid"}        paymentStatus     - Payment state; defaults to "pending".
 * @property {string}                  razorpayOrderId   - Razorpay order ID returned at order creation.
 * @property {string}                  razorpayPaymentId - Razorpay payment ID captured after successful payment.
 */
const bookingSchema = new mongoose.Schema(
    {
        listing: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Listing",
            required: true,
        },
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        checkIn: {
            type: Date,
        },
        checkOut: {
            type: Date,
        },
        totalAmount: {
            type: Number,
        },
        paymentStatus: {
            type: String,
            enum: ["pending", "paid"],
            default: "pending",
        },
        /** Razorpay order ID; set when the order is first created. */
        razorpayOrderId: {
            type: String,
        },
        /**
         * BUG FIX: This field was used in bookingController.js (booking.razorpayPaymentId = ...)
         * but was missing from the schema. Without it, Mongoose silently discards the
         * value and it is never persisted to the database.
         */
        razorpayPaymentId: {
            type: String,
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model("Booking", bookingSchema);
