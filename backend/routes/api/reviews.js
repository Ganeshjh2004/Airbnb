const express = require("express");
/**
 * mergeParams: true allows this router to access :id (listing ID)
 * from the parent router mounting path:
 *   router.use("/listings/:id/reviews", reviewsRouter)
 */
const router = express.Router({ mergeParams: true });
const { apiIsLoggedIn } = require("./middleware");
const reviewsController = require("../../controllers/api/reviewsController");

/**
 * POST /api/listings/:id/reviews
 * Creates a new review for listing :id.
 * Requires authentication. Body: { rating: 1-5, comment: "string" }
 */
router.post("/", apiIsLoggedIn, reviewsController.createReview);

/**
 * DELETE /api/listings/:id/reviews/:reviewId
 * Deletes a specific review. Only the review author may delete.
 * Authorization check is inside the controller.
 */
router.delete("/:reviewId", apiIsLoggedIn, reviewsController.destroyReview);

module.exports = router;
