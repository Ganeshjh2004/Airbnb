const Listing = require("../models/listing.js");
const User = require("../models/user.js");

/**
 * Controller: Renders the Admin Dashboard with analytics and full listing CRUD controls.
 *
 * Provides:
 *  - totalListings: total count of all property listings
 *  - totalUsers: total count of registered users
 *  - userBreakdown: aggregation grouped by owner with username and listing count
 *  - allListings: list of all properties populated with owner details
 *
 * @async
 * @param {import("express").Request}  req
 * @param {import("express").Response} res
 */
module.exports.renderDashboard = async (req, res) => {
    // 1. Total counts
    const totalListings = await Listing.countDocuments();
    const totalUsers = await User.countDocuments();

    // 2. Per-user breakdown: listings owned per user (aggregate grouped by owner)
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

    // 3. All listings with owner info
    const allListings = await Listing.find({})
        .populate("owner")
        .sort({ createdAt: -1 });

    res.render("admin-dashboard.ejs", {
        totalListings,
        totalUsers,
        userBreakdown,
        allListings,
    });
};

// Provide .dashboard alias
module.exports.dashboard = module.exports.renderDashboard;
