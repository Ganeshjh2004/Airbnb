const Review = require("../../models/review");
const Listing = require("../../models/listing");
const { reviewSchema } = require("../../schema.js");

/**
 * POST /api/listings/:id/reviews
 * Creates a new review for the listing identified by :id.
 * Requires authentication. Body: { rating: number, comment: string }
 * (flat JSON — no nested `review` wrapper needed from the API).
 *
 * The body is normalized so it also accepts the EJS-style `{ review: { rating, comment } }`
 * wrapper, making the controller reusable in both contexts.
 */
module.exports.createReview = async (req, res) => {
    const listing = await Listing.findById(req.params.id);
    if (!listing) {
        return res.status(404).json({ error: "Listing not found." });
    }

    // Accept flat { rating, comment } OR the EJS-wrapped { review: { rating, comment } }
    const payload = req.body.review ?? req.body;

    // Validate with the shared Joi schema (wrapped form)
    const { error } = reviewSchema.validate({ review: payload });
    if (error) {
        const errMsg = error.details.map((el) => el.message).join(", ");
        return res.status(400).json({ error: errMsg });
    }

    const newReview = new Review({
        rating: payload.rating,
        comment: payload.comment,
        author: req.user._id,
    });

    listing.reviews.push(newReview);
    await newReview.save();
    await listing.save();

    // Populate author so the response matches what ListingDetail expects
    await newReview.populate("author", "username");

    return res.status(201).json({
        success: true,
        review: {
            _id: newReview._id,
            rating: newReview.rating,
            comment: newReview.comment,
            createdAt: newReview.createdAt,
            author: {
                _id: newReview.author._id,
                username: newReview.author.username,
            },
        },
    });
};

/**
 * DELETE /api/listings/:id/reviews/:reviewId
 * Deletes a specific review. Only the review author can delete their own review.
 */
module.exports.destroyReview = async (req, res) => {
    const { id, reviewId } = req.params;

    // Authorization: only the review author may delete
    const review = await Review.findById(reviewId);
    if (!review) {
        return res.status(404).json({ error: "Review not found." });
    }
    if (!review.author.equals(req.user._id)) {
        return res.status(403).json({ error: "You do not have permission to delete this review." });
    }

    // Atomically remove from listing's reviews array
    await Listing.findByIdAndUpdate(id, { $pull: { reviews: reviewId } });
    await Review.findByIdAndDelete(reviewId);

    return res.json({ success: true, message: "Review deleted successfully." });
};
