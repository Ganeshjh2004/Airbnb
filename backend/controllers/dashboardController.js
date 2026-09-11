const Listing = require("../models/listing");
const Booking = require("../models/Booking");

/**
 * Controller: Renders the host dashboard for the currently logged-in user.
 *
 * Displays:
 *  a) All listings owned by the current user (with edit/delete links).
 *  b) All paid bookings for those listings, populated with guest user info
 *     and listing info so the view can display guest name, dates, and amount.
 *
 * Query strategy:
 *  1. Find all Listing documents where `owner` equals the logged-in user.
 *  2. Collect the listing IDs into an array.
 *  3. Find all Booking documents where `listing` is in that array AND
 *     `paymentStatus` is "paid", then populate `user` (guest) and `listing`.
 *
 * @async
 * @param {import("express").Request}  req
 * @param {import("express").Response} res
 */
exports.showDashboard = async (req, res) => {
    try {
        // All listings owned by the current user
        const ownedListings = await Listing.find({ owner: req.user._id });

        // Collect IDs for the booking query
        const listingIds = ownedListings.map((l) => l._id);

        // Paid bookings across those listings — skip DB call if no listings
        const bookings =
            listingIds.length > 0
                ? await Booking.find({
                      listing: { $in: listingIds },
                      paymentStatus: "paid",
                  })
                      .populate("user")    // guest: { username, email, ... }
                      .populate("listing") // listing: { title, location, ... }
                      .sort({ checkIn: 1 })
                : [];

        res.render("dashboard", {
            ownedListings,
            bookings,
        });
    } catch (err) {
        console.error("Dashboard error:", err.stack || err);
        req.flash("error", "Something went wrong loading your dashboard.");
        res.redirect("/listings");
    }
};
