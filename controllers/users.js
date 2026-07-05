const User = require("../models/user");

/**
 * Renders the user registration form.
 *
 * @param {import("express").Request}  req
 * @param {import("express").Response} res
 */
module.exports.renderSignupForm = (req, res) => {
    res.render("users/signup.ejs");
};

/**
 * Handles new user registration.
 *
 * Creates a new User document using passport-local-mongoose's `register()`
 * method, which hashes the password securely. On success, the user is
 * automatically logged in via req.login() and redirected to the listings page.
 *
 * On failure (e.g. username already taken), a flash error is set and the
 * user is redirected back to the signup form.
 *
 * @async
 * @param {import("express").Request}  req - Body: { username, email, password }
 * @param {import("express").Response} res
 * @param {import("express").NextFunction} next - Required for passing errors from req.login().
 */
module.exports.signup = async (req, res, next) => {
    try {
        const { username, email, password } = req.body;
        const newUser = new User({ email, username });
        const registeredUser = await User.register(newUser, password);

        // Log the user in immediately after registration
        req.login(registeredUser, (err) => {
            // BUG FIX: `next` was not declared as a parameter of this function,
            // causing a ReferenceError crash if req.login() encountered an error.
            // `next` is now correctly declared in the function signature above.
            if (err) {
                return next(err);
            }
            req.flash("success", "Welcome to Wanderlust!");
            res.redirect("/listings");
        });
    } catch (e) {
        req.flash("error", e.message);
        res.redirect("/signup");
    }
};

/**
 * Renders the login form.
 *
 * @param {import("express").Request}  req
 * @param {import("express").Response} res
 */
module.exports.renderLoginForm = (req, res) => {
    res.render("users/login.ejs");
};

/**
 * Handles successful login (called after Passport authentication succeeds).
 *
 * Redirects the user to the URL they originally tried to access, or falls
 * back to /listings if no redirect URL was saved.
 *
 * @param {import("express").Request}  req
 * @param {import("express").Response} res
 */
module.exports.login = (req, res) => {
    req.flash("success", "Welcome back to Wanderlust!");
    const redirectUrl = res.locals.redirectUrl || "/listings";
    res.redirect(redirectUrl);
};

/**
 * Handles user logout via Passport's req.logout() method.
 *
 * Passport's logout() is asynchronous in v0.6+; a callback must be supplied.
 * On success, a flash message is set and the user is redirected to the listings page.
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
        req.flash("success", "You have been logged out successfully.");
        res.redirect("/listings");
    });
};
