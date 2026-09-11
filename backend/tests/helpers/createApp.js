/**
 * tests/helpers/createApp.js
 *
 * Builds a testable Express application that mirrors app.js but:
 *  - Does NOT call mongoose.connect() (tests manage the DB connection via db.js)
 *  - Uses a plain in-memory session store instead of MongoStore (no Atlas URL needed)
 *  - Does NOT call app.listen() (Supertest manages the HTTP server)
 *  - Sets required env vars for passport-local-mongoose / crypto so tests work
 *    without a real .env file
 *
 * All routes and middleware are identical to production.
 */

// Provide stub env vars so modules that read process.env at require-time don't crash.
process.env.SECRET = process.env.SECRET || "test-secret";
process.env.RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || "rzp_test_fake";
process.env.RAZORPAY_SECRET = process.env.RAZORPAY_SECRET || "fake_razorpay_secret";
process.env.GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "fake-google-client-id";
process.env.GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "fake-google-client-secret";
process.env.GOOGLE_CALLBACK_URL = process.env.GOOGLE_CALLBACK_URL || "http://localhost:8080/auth/google/callback";
process.env.GMAIL_USER = process.env.GMAIL_USER || "test@example.com";
process.env.GMAIL_PASS = process.env.GMAIL_PASS || "fake-pass";

const express = require("express");
const session = require("express-session");
const flash = require("connect-flash");
const passport = require("passport");
const methodOverride = require("method-override");
const path = require("path");
const ejsMate = require("ejs-mate");

// Models & strategies (must be required before routes use them)
require("../../models/user");
require("../../models/Admin");
require("../../Passport"); // registers Local + Google strategies and serialisers

// Route modules
const listingRouter = require("../../routes/listing.js");
const reviewRouter = require("../../routes/review.js");
const userRouter = require("../../routes/user.js");
const legalRoutes = require("../../routes/legal.js");
const bookingRoutes = require("../../routes/booking");
const dashboardRoutes = require("../../routes/dashboard");
const adminRoutes = require("../../routes/admin");
const apiRouter = require("../../routes/api");

/**
 * Factory: builds and returns the Express app.
 * Call this once per test suite (not once per test) for performance.
 *
 * @returns {import("express").Application}
 */
function createApp() {
  const app = express();

  // ── View engine (needed because controllers call res.render()) ──────────────
  app.engine("ejs", ejsMate);
  app.set("view engine", "ejs");
  app.set("views", path.join(__dirname, "../../views"));

  // ── Core middleware ──────────────────────────────────────────────────────────
  app.use(express.urlencoded({ extended: true }));
  app.use(express.json());
  app.use(methodOverride("_method"));

  // ── Session (in-memory store — no MongoStore/Atlas needed in tests) ──────────
  app.use(
    session({
      secret: process.env.SECRET,
      resave: false,
      saveUninitialized: false, // false is safer for tests
      cookie: { httpOnly: true },
    })
  );

  // ── Flash messages ───────────────────────────────────────────────────────────
  app.use(flash());

  // ── Passport ─────────────────────────────────────────────────────────────────
  app.use(passport.initialize());
  app.use(passport.session());

  // ── Global template locals ────────────────────────────────────────────────────
  app.use((req, res, next) => {
    res.locals.success = req.flash("success");
    res.locals.error = req.flash("error");
    res.locals.currUser = req.user;
    res.locals.currAdmin =
      req.user &&
      (req.user.constructor && req.user.constructor.modelName === "Admin");
    next();
  });

  // ── Routes ────────────────────────────────────────────────────────────────────
  app.use("/", bookingRoutes);
  app.use("/", dashboardRoutes);
  app.use("/admin", adminRoutes);
  app.use("/listings", listingRouter);
  app.use("/listings/:id/reviews", reviewRouter);
  app.use("/", userRouter);
  app.use("/", legalRoutes);
  app.use("/api", apiRouter);

  // ── Error handler (keeps Supertest from seeing unhandled rejections) ──────────
  app.use((err, req, res, next) => {
    const { statusCode = 500, message = "Something went wrong." } = err;
    res.status(statusCode).json({ error: message });
  });

  return app;
}

module.exports = createApp;
