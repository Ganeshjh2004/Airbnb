const mongoose = require("mongoose");
const Schema = mongoose.Schema;

/**
 * Mongoose schema for a listing Review.
 *
 * Each review belongs to a Listing (via the reviews array on the Listing model)
 * and is authored by a User. The review captures a numeric star rating (1–5)
 * and a text comment.
 *
 * @typedef {Object} Review
 * @property {string}               comment   - The reviewer's written feedback.
 * @property {number}               rating    - Star rating between 1 and 5 (inclusive).
 * @property {Date}                 createdAt - Timestamp of when the review was created.
 * @property {mongoose.Types.ObjectId} author - Reference to the User who wrote the review.
 */
const reviewSchema = new Schema({
    comment: {
        type: String,
    },
    rating: {
        type: Number,
        min: 1,
        max: 5,
    },
    createdAt: {
        type: Date,
        /**
         * BUG FIX: Was `Date.now()` (invoked immediately at schema definition time),
         * meaning every review document would share the exact same timestamp —
         * the moment the server started. Changed to `Date.now` (a function reference)
         * so Mongoose calls it at document creation time, giving each review its
         * own correct timestamp.
         */
        default: Date.now,
    },
    author: {
        type: Schema.Types.ObjectId,
        ref: "User",
    },
});

module.exports = mongoose.model("Review", reviewSchema);