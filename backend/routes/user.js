const express = require("express");
const router = express.Router();
const wrapAsync = require("../utils/wrapAsyc");
const passport = require("passport");
const { saveRedirectUrl } = require("../middleware.js");
const userController = require("../controllers/users.js");

// Note: The User model is NOT imported here — it is only needed in the controller.

/**
 * GET  /signup — Render the registration form
 * POST /signup — Submit the registration form (creates a new user account)
 */
router
    .route("/signup")
    .get(userController.renderSignupForm)
    .post(wrapAsync(userController.signup));

/**
 * GET  /login — Render the login form
 * POST /login — Submit login credentials
 *
 * Middleware chain for POST /login:
 *  1. saveRedirectUrl — copies the pre-login URL from session into res.locals
 *     before Passport clears the session on login.
 *  2. passport.authenticate("local") — verifies username + password.
 *     On failure, sets a flash message and redirects to /login.
 *  3. userController.login — redirects to the original URL or /listings.
 */
router
    .route("/login")
    .get(userController.renderLoginForm)
    .post(
        saveRedirectUrl,
        passport.authenticate("local", {
            failureRedirect: "/login",
            failureFlash: true,
        }),
        userController.login
    );

/**
 * GET /logout — Logs the user out and redirects to /listings.
 * Uses GET (not POST) for simplicity; a logout link in the navbar is sufficient
 * since there is no sensitive state to protect here.
 */
router.get("/logout", userController.logout);

module.exports = router;
