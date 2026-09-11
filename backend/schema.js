const Joi = require("joi");

/**
 * Joi validation schema for creating or updating a Listing.
 *
 * Wraps the listing data under a `listing` key to match the HTML form field
 * naming convention (e.g. name="listing[title]").
 *
 * Validation is applied server-side in middleware.js (validateListing) before
 * the request reaches the controller.
 *
 * @example
 * // Request body shape expected by this schema:
 * // { listing: { title, description, location, country, price, category } }
 */
module.exports.listingSchema = Joi.object({
    listing: Joi.object({
        title: Joi.string().required(),
        description: Joi.string().required(),
        location: Joi.string().required(),
        country: Joi.string().required(),
        /**
         * BUG FIX: Was `Joi.string()` — price is stored as a Number in MongoDB
         * and must be validated as a number. Using Joi.string() caused incorrect
         * validation errors and would allow non-numeric strings to pass when the
         * Mongoose model then cast them, producing NaN in the database.
         */
        price: Joi.number().required().min(0),
        image: Joi.string().allow("", null),
        category: Joi.string()
            .valid(
                "Trending",
                "Rooms",
                "Iconic Cities",
                "Mountains",
                "Castles",
                "Amazing Pools",
                "Camping",
                "Farms",
                "Doms",
                "Boats",
                "Historical Homes"
            )
            .required(),
    }).required(),
});

/**
 * Joi validation schema for creating a Review.
 *
 * Wraps review data under a `review` key to match the HTML form field
 * naming convention (e.g. name="review[rating]").
 *
 * Applied in middleware.js (validateReview) before the request reaches the controller.
 *
 * @example
 * // Request body shape expected by this schema:
 * // { review: { rating: 4, comment: "Great place!" } }
 */
module.exports.reviewSchema = Joi.object({
    review: Joi.object({
        rating: Joi.number().required().min(1).max(5),
        comment: Joi.string().required(),
    }).required(),
});
