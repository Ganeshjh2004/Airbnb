const Razorpay = require("razorpay");

/**
 * Singleton Razorpay instance configured with credentials from environment variables.
 *
 * This instance is imported by bookingController.js to create and manage
 * Razorpay payment orders. The key_secret is used server-side only (never
 * exposed to the client) and is also used for HMAC signature verification
 * during payment confirmation.
 *
 * Required environment variables:
 *  - RAZORPAY_KEY_ID : Your Razorpay Key ID (safe to expose in frontend)
 *  - RAZORPAY_SECRET : Your Razorpay Key Secret (must remain server-side only)
 *
 * @type {Razorpay}
 */
const instance = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_SECRET,
});

module.exports = instance;
