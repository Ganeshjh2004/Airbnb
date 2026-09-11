const Listing = require("../../models/listing");
const Booking = require("../../models/Booking");
const User = require("../../models/user");

/**
 * GET /api/dashboard
 * Host dashboard: returns owned listings and paid bookings for those listings.
 */
module.exports.hostDashboard = async (req, res) => {
    try {
        const ownedListings = await Listing.find({ owner: req.user._id });
        const listingIds = ownedListings.map((l) => l._id);

        const bookings =
            listingIds.length > 0
                ? await Booking.find({
                      listing: { $in: listingIds },
                      paymentStatus: "paid",
                  })
                      .populate("user", "username email")
                      .populate("listing")
                      .sort({ checkIn: 1 })
                : [];

        return res.json({
            ownedListings,
            bookings,
        });
    } catch (err) {
        console.error("API hostDashboard error:", err);
        return res
            .status(500)
            .json({ error: "Failed to load host dashboard." });
    }
};

/**
 * GET /api/admin/dashboard
 * Admin dashboard: returns counts, breakdown by owner, and all listings.
 */
module.exports.adminDashboard = async (req, res) => {
    try {
        const totalListings = await Listing.countDocuments();
        const totalUsers = await User.countDocuments();

        const userBreakdown = await Listing.aggregate([
            {
                $group: {
                    _id: "$owner",
                    listingCount: { $sum: 1 },
                },
            },
            {
                $lookup: {
                    from: "users",
                    localField: "_id",
                    foreignField: "_id",
                    as: "userDetails",
                },
            },
            {
                $unwind: {
                    path: "$userDetails",
                    preserveNullAndEmptyArrays: true,
                },
            },
            {
                $project: {
                    _id: 1,
                    username: { $ifNull: ["$userDetails.username", "Unknown"] },
                    listingCount: 1,
                },
            },
            {
                $sort: { listingCount: -1 },
            },
        ]);

        const allListings = await Listing.find({})
            .populate("owner", "username email")
            .sort({ createdAt: -1 });

        return res.json({
            totalListings,
            totalUsers,
            userBreakdown,
            allListings,
        });
    } catch (err) {
        console.error("API adminDashboard error:", err);
        return res
            .status(500)
            .json({ error: "Failed to load admin dashboard." });
    }
};
