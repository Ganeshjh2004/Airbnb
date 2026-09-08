const express = require("express");
const router = express.Router();
const dashboardController = require("../controllers/dashboardController");
const { isLoggedIn } = require("../middleware.js");

/**
 * GET /dashboard
 * Shows the host dashboard: owned listings + paid bookings for those listings.
 * Requires the user to be logged in.
 */
router.get("/dashboard", isLoggedIn, dashboardController.showDashboard);

module.exports = router;
