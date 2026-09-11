const express = require("express");
const router = express.Router();
const authController = require("../../controllers/api/authController");

/**
 * POST /api/auth/signup - Register new user and start session
 */
router.post("/signup", authController.signup);

/**
 * POST /api/auth/login - Authenticate credentials and start session
 */
router.post("/login", authController.login);

/**
 * POST /api/auth/logout - End session
 */
router.post("/logout", authController.logout);

/**
 * GET /api/auth/me - Check current authentication session
 */
router.get("/me", authController.me);

module.exports = router;
