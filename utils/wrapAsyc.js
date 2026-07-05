/**
 * Wraps an asynchronous Express route handler to automatically forward any
 * rejected promise (unhandled async error) to Express's next() error handler.
 *
 * Without this wrapper every async route would need its own try/catch block.
 * By wrapping handlers with wrapAsync, errors bubble up to the centralised
 * error-handling middleware defined in app.js.
 *
 * Note: The filename "wrapAsyc" has a typo (missing 'n') but is intentionally
 * preserved to avoid breaking existing require() calls throughout the project.
 *
 * @param {Function} fn - An async Express route handler: (req, res, next) => Promise
 * @returns {Function}  - A standard Express middleware function that catches async errors
 *
 * @example
 * router.get("/listings", wrapAsync(listingController.index));
 */
module.exports = (fn) => {
    return (req, res, next) => {
        fn(req, res, next).catch(next);
    };
};
