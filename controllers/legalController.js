/**
 * Controller: Renders the Privacy Policy page.
 *
 * Note: `async` is intentionally removed — there is no asynchronous
 * operation in this handler, and wrapping a synchronous function in async
 * adds unnecessary overhead.
 *
 * @param {import("express").Request}  req
 * @param {import("express").Response} res
 * @param {import("express").NextFunction} next
 */
exports.privacy = (req, res, next) => {
    try {
        res.render("listings/privacy.ejs");
    } catch (error) {
        next(error); // Delegate to the centralised Express error handler
    }
};

/**
 * Controller: Renders the Terms & Conditions page.
 *
 * Note: `async` is intentionally removed — there is no asynchronous
 * operation in this handler.
 *
 * @param {import("express").Request}  req
 * @param {import("express").Response} res
 * @param {import("express").NextFunction} next
 */
exports.terms = (req, res, next) => {
    try {
        res.render("listings/terms.ejs");
    } catch (error) {
        next(error); // Delegate to the centralised Express error handler
    }
};
