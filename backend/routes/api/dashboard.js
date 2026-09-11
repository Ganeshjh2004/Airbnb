const express = require("express");
const router = express.Router();
const dashboardController = require("../../controllers/api/dashboardController");
const { apiIsLoggedIn, apiIsAdminLoggedIn } = require("./middleware");

/**
 * GET /api/dashboard - Host dashboard (owned listings & paid bookings)
 */
router.get("/dashboard", apiIsLoggedIn, dashboardController.hostDashboard);

/**
 * GET /api/admin/dashboard - Administrator dashboard (system metrics & analytics)
 */
router.get(
    "/admin/dashboard",
    apiIsAdminLoggedIn,
    dashboardController.adminDashboard
);

module.exports = router;
