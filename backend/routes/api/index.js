const express = require("express");
const router = express.Router();
const cors = require("cors");

// ─── CORS Configuration ───────────────────────────────────────────────────────
// Uses ALLOWED_ORIGIN if set, or falls back to http://localhost:5173 (fail-closed in prod)
const defaultOrigin = "http://localhost:5173";
const allowedOrigin = process.env.ALLOWED_ORIGIN || defaultOrigin;
const corsOptions = {
    origin: allowedOrigin.includes(",")
        ? allowedOrigin.split(",").map((s) => s.trim())
        : allowedOrigin,
    credentials: true,
};

router.use(cors(corsOptions));

// ─── Sub-routers ─────────────────────────────────────────────────────────────
const listingsRoutes = require("./listings");
const bookingsRoutes = require("./bookings");
const dashboardRoutes = require("./dashboard");
const authRoutes = require("./auth");

router.use("/listings", listingsRoutes);
router.use("/bookings", bookingsRoutes);
router.use("/", dashboardRoutes);
router.use("/auth", authRoutes);

// ─── Catch-all 404 for API routes ─────────────────────────────────────────────
router.use((req, res) => {
    res.status(404).json({ error: `API route not found: ${req.method} ${req.originalUrl}` });
});

// ─── API JSON Error Handler ──────────────────────────────────────────────────
router.use((err, req, res, next) => {
    const statusCode = err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(statusCode).json({ error: message });
});

module.exports = router;
