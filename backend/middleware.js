const Listing = require("./models/listing");
const Review = require("./models/review");
const Admin = require("./models/Admin");
const ExpressError = require("./utils/ExpressError.js");
const { listingSchema, reviewSchema } = require("./schema.js");

/**
 * Middleware: Ensures the request is made by an authenticated user.
 *
 * If the user is not logged in, the originally requested URL is saved to
 * the session so the user can be redirected back after logging in.
 * A flash error is set and the user is redirected to the login page.
 *
 * @param {import("express").Request}  req
 * @param {import("express").Response} res
 * @param {import("express").NextFunction} next
 */
module.exports.isLoggedIn = (req, res, next) => {
    if (!req.isAuthenticated()) {
        req.session.redirectUrl = req.originalUrl;
        req.flash("error", "You must be logged in to perform this action.");
        return res.redirect("/login");
    }
    next();
};

/**
 * Middleware: Transfers the post-login redirect URL from the session into
 * res.locals so it survives the Passport login redirect cycle.
 *
 * Passport clears the session on successful authentication, so any data
 * stored in req.session before login is lost after it. By copying the URL
 * into res.locals here (before the Passport middleware runs) the login
 * controller can still access it via res.locals.redirectUrl.
 *
 * @param {import("express").Request}  req
 * @param {import("express").Response} res
 * @param {import("express").NextFunction} next
 */
module.exports.saveRedirectUrl = (req, res, next) => {
    if (req.session.redirectUrl) {
        res.locals.redirectUrl = req.session.redirectUrl;
    }
    next();
};

/**
 * Middleware: Ensures the currently logged-in user is the owner of the listing.
 *
 * Must be used after isLoggedIn. If the listing is not found, or the current
 * user is not the owner, a flash error is set and the user is redirected.
 *
 * @param {import("express").Request}  req - Must contain req.params.id (listing ID).
 * @param {import("express").Response} res
 * @param {import("express").NextFunction} next
 * @throws {ExpressError} 404 if the listing does not exist.
 */
module.exports.isOwner = async (req, res, next) => {
    const { id } = req.params;
    const listing = await Listing.findById(id);

    // BUG FIX: Previously had no null-check — if listing was not found,
    // calling listing.owner._id would throw a TypeError and crash the server.
    if (!listing) {
        req.flash("error", "Listing not found.");
        return res.redirect("/listings");
    }

    // Admin bypass: full CRUD authorization for authenticated administrators
    const isAdmin =
        req.isAuthenticated() &&
        (req.user instanceof Admin ||
            (req.user && req.user.constructor && req.user.constructor.modelName === "Admin"));

    if (isAdmin) {
        return next();
    }

    if (!res.locals.currUser || !listing.owner._id.equals(res.locals.currUser._id)) {
        req.flash("error", "You do not have permission to do that.");
        return res.redirect(`/listings/${id}`);
    }

    next();
};

/**
 * Middleware: Validates the request body against the listing Joi schema.
 *
 * Rejects requests with missing or invalid fields before they reach the
 * controller, preventing bad data from reaching MongoDB.
 *
 * @param {import("express").Request}  req - Body must contain a `listing` object.
 * @param {import("express").Response} res
 * @param {import("express").NextFunction} next
 * @throws {ExpressError} 400 with validation error details if the body is invalid.
 */
module.exports.validateListing = (req, res, next) => {
    const { error } = listingSchema.validate(req.body);
    if (error) {
        const errMsg = error.details.map((el) => el.message).join(", ");
        return next(new ExpressError(400, errMsg));
    }
    next();
};

/**
 * Middleware: Validates the request body against the review Joi schema.
 *
 * Rejects reviews with missing rating or comment before they reach the
 * controller.
 *
 * @param {import("express").Request}  req - Body must contain a `review` object.
 * @param {import("express").Response} res
 * @param {import("express").NextFunction} next
 * @throws {ExpressError} 400 with validation error details if the body is invalid.
 */
module.exports.validateReview = (req, res, next) => {
    const { error } = reviewSchema.validate(req.body);
    if (error) {
        const errMsg = error.details.map((el) => el.message).join(", ");
        return next(new ExpressError(400, errMsg));
    }
    next();
};

/**
 * Middleware: Ensures the currently logged-in user is the author of the review.
 *
 * Must be used after isLoggedIn. Prevents users from deleting other users'
 * reviews.
 *
 * @param {import("express").Request}  req - Must contain req.params.id and req.params.reviewId.
 * @param {import("express").Response} res
 * @param {import("express").NextFunction} next
 */
module.exports.isReviewAuthor = async (req, res, next) => {
    const { id, reviewId } = req.params;
    const review = await Review.findById(reviewId);

    // BUG FIX: Previously had no null-check — if the review was not found,
    // calling review.author would throw a TypeError and crash the server.
    if (!review) {
        req.flash("error", "Review not found.");
        return res.redirect(`/listings/${id}`);
    }

    if (!review.author.equals(res.locals.currUser._id)) {
        req.flash("error", "You do not have permission to do that.");
        return res.redirect(`/listings/${id}`);
    }

    next();
};

/**
 * Middleware: Ensures the request is made by an authenticated administrator.
 *
 * Verifies that:
 *  1. req.isAuthenticated() is true
 *  2. req.user is an Admin document (via instanceof, modelName, or isAdmin marker)
 *
 * Rejects unauthorized requests with a 403 status, flash error message,
 * and redirect to /admin/login.
 *
 * @param {import("express").Request}  req
 * @param {import("express").Response} res
 * @param {import("express").NextFunction} next
 */
module.exports.isAdminLoggedIn = (req, res, next) => {
    const isAdmin =
        req.isAuthenticated() &&
        (req.user instanceof Admin ||
            (req.user && req.user.constructor && req.user.constructor.modelName === "Admin"));

    if (!isAdmin) {
        req.flash("error", "Access denied. Administrator privileges required.");
        return res.redirect(403, "/admin/login");
    }
    next();
};