if (process.env.NODE_ENV !== "production") {
    require("dotenv").config();
}

console.log(process.env.SECRET);

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
const LocalStrategy = require("passport-local");
const ExpressError = require("./utils/ExpressError.js");

// Models & Passport
const User = require("./models/user.js");
require("./Passport");

// Routers
const listingRouter = require("./routes/listing.js");
const reviewRouter = require("./routes/review.js");
const userRouter = require("./routes/user.js");
const legalRoutes = require("./routes/legal.js");
const bookingRoutes = require("./routes/booking");
const Listing = require("./models/listing.js");

// View Engine Setup
app.engine("ejs", ejsMate);
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json()); // Needed for /verify-payment
app.use(methodOverride("_method"));
app.use(express.static(path.join(__dirname, "public")));

// MongoDB Connection
const dbUrl = process.env.ATLASDB_URL;

main().then(() => {
    console.log("Connected to DB");
}).catch((err) => {
    console.log(err);
});

async function main() {
    await mongoose.connect(dbUrl);
}

// Session Store
const store = MongoStore.create({
    mongoUrl: dbUrl,
    crypto: {
        secret: process.env.SECRET,
    },
    touchAfter: 24 * 3600,
});

store.on("error", (err) => {
    console.log("ERROR IN MONGO SESSION STORE", err);
});

const sessionOptions = {
    store,
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: {
        expire: Date.now() + 7 * 24 * 60 * 60 * 1000,
        maxAge: 7 * 24 * 60 * 60 * 1000,
        httpOnly: true,
    },
};

// Session, Flash, and Passport
app.use(session(sessionOptions));
app.use(flash());
app.use(passport.initialize());
app.use(passport.session());

// Make flash and user available in all templates
app.use((req, res, next) => {
    res.locals.success = req.flash("success");
    res.locals.error = req.flash("error");
    res.locals.currUser = req.user;
    next();
});

// Google OAuth Routes
app.get("/auth/google",
    passport.authenticate("google", { scope: ["profile", "email"] })
);

app.get("/auth/google/callback",
    passport.authenticate("google", {
        failureRedirect: "/login",
        failureFlash: true,
    }),
    (req, res) => {
        req.flash("success", "Welcome back!");
        res.redirect("/listings");
    }
);

// Routers
app.use("/", bookingRoutes);
app.use("/listings", listingRouter);
app.use("/listings/:id/reviews", reviewRouter);
app.use("/", userRouter);
app.use("/", legalRoutes);

// Search route
app.get("/search", async (req, res) => {
    const { searchList } = req.query;
    console.log("Search Query:", searchList);

    try {
        const list = await Listing.find({
            $or: [
                { title: { $regex: searchList, $options: "i" } },
                { country: { $regex: searchList, $options: "i" } },
                { location: { $regex: searchList, $options: "i" } },
                { description: { $regex: searchList, $options: "i" } }
            ]
        });

        console.log("Listings Found:", list.length);
        res.render("listings/search", { list });
    } catch (err) {
        console.error("Search Error:", err);
        res.status(500).send("Internal Server Error");
    }
});

// Category filter route
app.get("/categories/:category", async (req, res) => {
    const { category } = req.params;
    try {
        const listings = await Listing.find({ category: { $regex: new RegExp(`^${category}$`, "i") } });
        res.render("listings/index", { allListings: listings });
    } catch (err) {
        req.flash("error", "Unable to fetch listings for this category.");
        res.redirect("/");
    }
});

// Redirect root to listings
app.use("/", (req, res) => {
    res.redirect("/listings");
});

// Catch-all route
app.all("*", (req, res, next) => {
    next(new ExpressError(404, "Page Not Found!"));
});

// Error handler
app.use((err, req, res, next) => {
    const { statusCode = 500, message = "Something Went Wrong" } = err;
    res.status(statusCode).render("listings/error", { message });
});

// Start server
app.listen(8080, () => {
    console.log("App listening on port 8080");
});

