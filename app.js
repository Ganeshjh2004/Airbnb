/**
 * app.js — Application entry point.
 *
 * Bootstraps the Express server:
 *  - Connects to MongoDB via Mongoose
 *  - Configures middleware (session, Passport, flash, static files)
 *  - Mounts all route modules
 *  - Defines the search and category-filter routes
 *  - Sets up global error handling
 */

// Load environment variables from .env file.
// dotenv.config() is safe to call in all environments:
// - Locally: reads .env and sets process.env variables
// - On Render/Heroku/production: no .env file exists, so this is a harmless no-op
//   and the real environment variables set in the dashboard take effect.
require("dotenv").config();

// Fix for Windows / ISP DNS resolution issues with MongoDB Atlas SRV records (querySrv ECONNREFUSED)
const dns = require("dns");
dns.setServers(["8.8.8.8", "1.1.1.1"]);

const express = require("express");
const app = express();
const mongoose = require("mongoose");
const path = require("path");
const methodOverride = require("method-override");
const ejsMate = require("ejs-mate");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const flash = require("connect-flash");
const passport = require("passport");
const ExpressError = require("./utils/ExpressError.js");

// Models & Passport strategy configuration
const User = require("./models/user.js");
require("./Passport"); // Registers Local and Google OAuth strategies + serialisers

// BUG FIX: Removed unused `LocalStrategy` import — it was imported here but
// the strategy is configured inside Passport.js, not in app.js.

// Route modules
const listingRouter = require("./routes/listing.js");
const reviewRouter = require("./routes/review.js");
const userRouter = require("./routes/user.js");
const legalRoutes = require("./routes/legal.js");
const bookingRoutes = require("./routes/booking");
const Listing = require("./models/listing.js");

// ─── View Engine ──────────────────────────────────────────────────────────────

app.engine("ejs", ejsMate); // Use ejs-mate for layout support
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// ─── Core Middleware ──────────────────────────────────────────────────────────

app.use(express.urlencoded({ extended: true })); // Parse HTML form bodies
app.use(express.json()); // Parse JSON bodies (required for /verify-payment)
app.use(methodOverride("_method")); // Allow PUT/DELETE via query string in forms
app.use(express.static(path.join(__dirname, "public")));

// ─── Database Connection ──────────────────────────────────────────────────────

const dbUrl = process.env.ATLASDB_URL;

/**
 * Connects to MongoDB Atlas. The app starts listening only after this resolves.
 * On failure, the error is printed and the process exits naturally.
 */
async function main() {
    await mongoose.connect(dbUrl);
}

main()
    .then(() => {
        console.log("Connected to MongoDB.");
    })
    .catch((err) => {
        console.error("MongoDB connection error:", err);
    });

// ─── Session Store (MongoDB-backed) ──────────────────────────────────────────

/**
 * Store sessions in MongoDB so they survive server restarts.
 * Sessions are encrypted using the SECRET env variable.
 * touchAfter prevents the session from being re-saved on every request;
 * it only updates the session if data has changed or 24 hours have passed.
 */
const store = MongoStore.create({
    mongoUrl: dbUrl,
    crypto: {
        secret: process.env.SECRET,
    },
    touchAfter: 24 * 3600,
});

store.on("error", (err) => {
    console.error("MongoDB session store error:", err);
});

const sessionOptions = {
    store,
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: {
        /**
         * BUG FIX: Was `expire` (ignored by express-session) — the correct
         * property name is `expires`. Without this, cookies were session cookies
         * (browser-lifetime only) rather than persistent 7-day cookies.
         */
        expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
        httpOnly: true, // Prevents client-side JS from reading the cookie (XSS protection)
    },
};

// ─── Session, Flash, and Passport ────────────────────────────────────────────

app.use(session(sessionOptions));
app.use(flash());
app.use(passport.initialize());
app.use(passport.session()); // Must come AFTER session() middleware

/**
 * Global template locals middleware.
 * Makes flash messages and the current user available in every EJS template
 * without having to pass them explicitly in every res.render() call.
 */
app.use((req, res, next) => {
    res.locals.success = req.flash("success");
    res.locals.error = req.flash("error");
    res.locals.currUser = req.user;
    next();
});

// ─── Google OAuth Routes ──────────────────────────────────────────────────────

/**
 * Redirects the user to Google's OAuth 2.0 consent screen.
 * Requests access to the user's profile and email address.
 */
app.get(
    "/auth/google",
    passport.authenticate("google", { scope: ["profile", "email"] })
);

/**
 * Google OAuth callback — called by Google after the user approves access.
 * On success, the user is logged in and redirected to the listings page.
 * On failure, the user is redirected to the login page with an error flash.
 */
app.get(
    "/auth/google/callback",
    passport.authenticate("google", {
        failureRedirect: "/login",
        failureFlash: true,
    }),
    (req, res) => {
        req.flash("success", "Welcome back!");
        res.redirect("/listings");
    }
);

// ─── Application Routes ───────────────────────────────────────────────────────

app.use("/", bookingRoutes);
app.use("/listings", listingRouter);
app.use("/listings/:id/reviews", reviewRouter);
app.use("/", userRouter);
app.use("/", legalRoutes);

// ─── Search Route ─────────────────────────────────────────────────────────────

/**
 * GET /search?searchList=<query>
 *
 * Full-text-style search across listing title, country, location, and description
 * using case-insensitive MongoDB $regex queries.
 *
 * SECURITY: User input is sanitised before being passed to $regex to prevent
 * ReDoS (Regular Expression Denial of Service) attacks. Special regex
 * metacharacters are escaped so they are treated as literal characters.
 */
app.get("/search", async (req, res) => {
    const { searchList } = req.query;

    // Guard: redirect to listings if query is empty or missing
    if (!searchList || !searchList.trim()) {
        return res.redirect("/listings");
    }

    // Escape regex metacharacters to prevent ReDoS attacks.
    // A malicious user could craft a query like "(a+)+" that causes catastrophic backtracking.
    const escapedQuery = searchList.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    try {
        const list = await Listing.find({
            $or: [
                { title: { $regex: escapedQuery, $options: "i" } },
                { country: { $regex: escapedQuery, $options: "i" } },
                { location: { $regex: escapedQuery, $options: "i" } },
                { description: { $regex: escapedQuery, $options: "i" } },
            ],
        });

        res.render("listings/search", { list });
    } catch (err) {
        console.error("Search error:", err);
        res.status(500).send("Internal Server Error");
    }
});

// ─── Category Filter Route ────────────────────────────────────────────────────

/**
 * GET /categories/:category
 *
 * Filters listings by the specified category using a case-insensitive exact match.
 * The regex `^category$` ensures only exact category names match (not substrings).
 */
app.get("/categories/:category", async (req, res) => {
    const { category } = req.params;
    try {
        const listings = await Listing.find({
            category: { $regex: new RegExp(`^${category}$`, "i") },
        });
        res.render("listings/index", { allListings: listings });
    } catch (err) {
        req.flash("error", "Unable to fetch listings for this category.");
        res.redirect("/listings");
    }
});

// ─── Root Redirect ────────────────────────────────────────────────────────────

/** Redirect the root URL to the listings page. */
app.use("/", (req, res) => {
    res.redirect("/listings");
});

// ─── 404 Catch-All ───────────────────────────────────────────────────────────

/**
 * Catch-all for any route not matched above.
 * Creates a 404 ExpressError and passes it to the error handler.
 */
app.all("*", (req, res, next) => {
    next(new ExpressError(404, "Page Not Found!"));
});

// ─── Global Error Handler ─────────────────────────────────────────────────────

/**
 * Express error-handling middleware (4 parameters — Express identifies this by arity).
 * Renders the error template with the status code and message from the error object.
 *
 * @param {Error} err - The error object (may be an ExpressError or a generic Error).
 */
app.use((err, req, res, next) => {
    const { statusCode = 500, message = "Something went wrong." } = err;
    res.status(statusCode).render("listings/error", { message });
});

// ─── Start Server ─────────────────────────────────────────────────────────────

app.listen(8080, () => {
    console.log("Server listening on port 8080.");
});
