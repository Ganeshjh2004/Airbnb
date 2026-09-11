const express = require("express");
const router = express.Router();
const passport = require("passport");
const { saveRedirectUrl, isAdminLoggedIn } = require("../middleware.js");
const adminController = require("../controllers/adminController.js");
const adminDashboardController = require("../controllers/adminDashboardController.js");

/**
 * GET  /admin/dashboard - Render the Admin analytics and listing management dashboard
 * GET  /admin           - Alias to admin dashboard
 */
router.get("/dashboard", isAdminLoggedIn, adminDashboardController.renderDashboard);
router.get("/", isAdminLoggedIn, adminDashboardController.renderDashboard);

/**
 * GET  /admin/login - Render the admin login form
 * POST /admin/login - Authenticate using the dedicated "admin-local" strategy
 */
router
    .route("/login")
    .get(adminController.renderLoginForm)
    .post(
        saveRedirectUrl,
        passport.authenticate("admin-local", {
            failureRedirect: "/admin/login",
            failureFlash: true,
        }),
        adminController.login
    );

/**
 * POST /admin/logout - Terminate admin session and redirect to /admin/login
 */
router.post("/logout", adminController.logout);
router.get("/logout", adminController.logout);

module.exports = router;
