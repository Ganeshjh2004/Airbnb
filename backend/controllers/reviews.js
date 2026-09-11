const Review = require("../models/review");
const Listing = require("../models/listing");

/**
 * Controller: Creates a new review and associates it with a listing.
 *
 * The review document is created with the current user as the author and then
 * pushed into the listing's reviews array. Both the review and the listing
 * are saved separately (the listing saves the updated reviews array reference).
 *
 * Validation is applied upstream by the validateReview middleware before this
 * controller is called.
 *
 * @async
 * @param {import("express").Request}  req - Params: { id }; Body: { review: { rating, comment } }
 * @param {import("express").Response} res
 */
module.exports.createReview = async (req, res) => {
    const listing = await Listing.findById(req.params.id);
    const newReview = new Review(req.body.review);

    // Tag the review with the currently authenticated user
    newReview.author = req.user._id;

    // Add the review reference to the listing's reviews array
    listing.reviews.push(newReview);

    await newReview.save();
    await listing.save();

    req.flash("success", "Review added successfully!");
    res.redirect(`/listings/${listing._id}`);
};

/**
 * Controller: Deletes a review and removes its reference from the parent listing.
 *
 * Uses MongoDB's $pull operator to atomically remove the review's ObjectId
 * from the listing's reviews array, then deletes the review document itself.
 *
 * Authorization (only the review author can delete) is enforced upstream by
 * the isReviewAuthor middleware.
 *
 * @async
 * @param {import("express").Request}  req - Params: { id, reviewId }
 * @param {import("express").Response} res
 */
module.exports.destroyRoute = async (req, res) => {
    const { id, reviewId } = req.params;

    // Remove the reviewId from the listing's reviews array atomically
    await Listing.findByIdAndUpdate(id, { $pull: { reviews: reviewId } });

    // Delete the review document itself
    await Review.findByIdAndDelete(reviewId);

    req.flash("success", "Review deleted successfully.");
    res.redirect(`/listings/${id}`);
};