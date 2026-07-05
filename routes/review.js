const express = require("express");
/**
 * mergeParams: true allows this router to access params from the parent router.
 * Required to access `:id` (listing ID) which is defined in the parent route:
 * app.use("/listings/:id/reviews", reviewRouter)
 */
const router = express.Router({ mergeParams: true });
const wrapAsync = require("../utils/wrapAsyc.js");
const { validateReview, isLoggedIn, isReviewAuthor } = require("../middleware.js");
const reviewController = require("../controllers/reviews.js");

// Note: Review and Listing models are NOT imported here — they are only needed
// inside the controller. Importing models in route files is an antipattern that
// was previously causing unused-variable warnings.

/**
 * POST /listings/:id/reviews
 * Creates a new review for the listing identified by :id.
 * Requires the user to be logged in and the body to pass review schema validation.
 */
router.post("/", isLoggedIn, validateReview, wrapAsync(reviewController.createReview));

/**
 * DELETE /listings/:id/reviews/:reviewId
 * Deletes a specific review.
 * Requires the user to be logged in and to be the review author.
 */
router.delete(
    "/:reviewId",
    isLoggedIn,
    isReviewAuthor,
    wrapAsync(reviewController.destroyRoute)
);

module.exports = router;