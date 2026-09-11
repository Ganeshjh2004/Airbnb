const Admin = require("../models/Admin");

/**
 * Controller: Renders the Admin login form.
 *
 * @param {import("express").Request}  req
 * @param {import("express").Response} res
 */
module.exports.renderLoginForm = (req, res) => {
    res.render("admin-login.ejs");
};

/**
 * Controller: Handles successful admin login.
 *
 * Called after passport.authenticate("admin-local") succeeds.
 * Clears any stored redirectUrl and redirects to the requested destination
 * or directly to the Admin Dashboard (/admin/dashboard).
 *
 * @param {import("express").Request}  req
 * @param {import("express").Response} res
 */
module.exports.login = (req, res) => {
    req.flash("success", "Welcome to the Admin Portal!");
    const redirectUrl = res.locals.redirectUrl || "/admin/dashboard";
    res.redirect(redirectUrl);
};

/**
 * Controller: Handles administrator logout via Passport req.logout().
 *
 * Terminates the admin session and redirects to /admin/login.
 *
 * @param {import("express").Request}  req
 * @param {import("express").Response} res
 * @param {import("express").NextFunction} next
 */
module.exports.logout = (req, res, next) => {
    req.logout((err) => {
        if (err) {
            return next(err);
        }
        req.flash("success", "Admin logged out successfully.");
        res.redirect("/admin/login");
    });
};
