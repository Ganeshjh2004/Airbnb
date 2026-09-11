const express = require("express");
const router = express.Router();
const bookingsController = require("../../controllers/api/bookingsController");
const { apiIsLoggedIn } = require("./middleware");

/**
 * GET  /api/bookings - Retrieve bookings for the authenticated user
 * POST /api/bookings - Create a new booking
 */
router
    .route("/")
    .get(apiIsLoggedIn, bookingsController.getUserBookings)
    .post(apiIsLoggedIn, bookingsController.createBooking);

/**
 * POST /api/bookings/:id/cancel - Cancel a paid booking
 */
router.post("/:id/cancel", apiIsLoggedIn, bookingsController.cancelBooking);

module.exports = router;
