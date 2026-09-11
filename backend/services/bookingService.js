const Booking = require("../models/Booking");
const razorpay = require("../config/razorpay");
const crypto = require("crypto");

/**
 * Service: Validates booking dates and checks for overlapping paid bookings.
 *
 * @async
 * @param {string|mongoose.Types.ObjectId} listingId
 * @param {string|Date} checkIn
 * @param {string|Date} checkOut
 * @returns {Promise<{ days: number }>}
 * @throws {Error} with .statusCode property if dates are invalid or slot is taken
 */
async function validateDatesAndCheckOverlap(listingId, checkIn, checkOut) {
    const days =
        (new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24);

    if (isNaN(days) || days <= 0) {
        const err = new Error("Check-out date must be after check-in date.");
        err.statusCode = 400;
        throw err;
    }

    const overlapping = await Booking.findOne({
        listing: listingId,
        paymentStatus: "paid",
        checkIn: { $lt: new Date(checkOut) },
        checkOut: { $gt: new Date(checkIn) },
    });

    if (overlapping) {
        const err = new Error(
            "These dates are already booked. Please choose different dates."
        );
        err.statusCode = 400;
        throw err;
    }

    return { days };
}

/**
 * Service: Creates a Razorpay order and a pending Booking document.
 *
 * @async
 * @param {Object} params
 * @param {Object} params.listing - The Mongoose listing document
 * @param {string|mongoose.Types.ObjectId} params.userId - Logged in user ID
 * @param {string|Date} params.checkIn
 * @param {string|Date} params.checkOut
 * @returns {Promise<{ booking: Object, order: Object }>}
 */
async function createBookingWithOrder({ listing, userId, checkIn, checkOut }) {
    const { days } = await validateDatesAndCheckOverlap(
        listing._id,
        checkIn,
        checkOut
    );

    const totalAmountPaise = listing.price * days * 100;

    const order = await razorpay.orders.create({
        amount: totalAmountPaise,
        currency: "INR",
        receipt: `receipt_${Date.now()}`,
    });

    const booking = new Booking({
        listing: listing._id,
        user: userId,
        checkIn,
        checkOut,
        totalAmount: totalAmountPaise / 100,
        razorpayOrderId: order.id,
    });

    await booking.save();

    return { booking, order };
}

/**
 * Service: Verifies the Razorpay payment signature using HMAC-SHA256.
 *
 * @param {Object} params
 * @param {string} params.razorpay_order_id
 * @param {string} params.razorpay_payment_id
 * @param {string} params.razorpay_signature
 * @returns {boolean}
 */
function verifyPaymentSignature({
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
}) {
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        return false;
    }
    const body = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSignature = crypto
        .createHmac("sha256", process.env.RAZORPAY_SECRET)
        .update(body)
        .digest("hex");

    return expectedSignature === razorpay_signature;
}

/**
 * Service: Cancels a paid booking and issues a Razorpay refund.
 *
 * Enforces:
 *  - Booking existence
 *  - Ownership (must match userId)
 *  - Status must be 'paid'
 *  - Must be more than 24h before check-in
 *
 * @async
 * @param {string|mongoose.Types.ObjectId} bookingId
 * @param {string|mongoose.Types.ObjectId} userId
 * @returns {Promise<Object>} The updated booking document
 */
async function cancelAndRefundBooking(bookingId, userId) {
    const booking = await Booking.findById(bookingId);

    if (!booking) {
        const err = new Error("Booking not found.");
        err.statusCode = 404;
        throw err;
    }

    if (!booking.user.equals(userId)) {
        const err = new Error("You are not authorised to cancel this booking.");
        err.statusCode = 403;
        throw err;
    }

    if (booking.paymentStatus !== "paid") {
        const err = new Error(
            "Only confirmed (paid) bookings can be cancelled."
        );
        err.statusCode = 400;
        throw err;
    }

    const hoursUntilCheckIn =
        (new Date(booking.checkIn) - Date.now()) / (1000 * 60 * 60);

    if (hoursUntilCheckIn <= 24) {
        const err = new Error(
            "Cancellations are only allowed more than 24 hours before check-in."
        );
        err.statusCode = 400;
        throw err;
    }

    await razorpay.payments.refund(booking.razorpayPaymentId, {
        amount: booking.totalAmount * 100,
    });

    booking.paymentStatus = "cancelled";
    await booking.save();

    return booking;
}

module.exports = {
    validateDatesAndCheckOverlap,
    createBookingWithOrder,
    verifyPaymentSignature,
    cancelAndRefundBooking,
};
