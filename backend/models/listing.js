const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const Review = require("./review.js");

/**
 * Mongoose schema for a property Listing.
 *
 * A Listing is the core entity of the platform. It is created by an owner (User),
 * belongs to a category, has an image stored on Cloudinary, can be reviewed,
 * and can be booked. When a Listing is deleted, all associated Reviews are also
 * deleted via the post-hook below.
 *
 * @typedef {Object} Listing
 * @property {string}                  title       - Display title of the listing.
 * @property {string}                  description - Detailed description of the property.
 * @property {{ url: string, filename: string }} image - Cloudinary image metadata.
 * @property {number}                  price       - Per-night price in the local currency.
 * @property {string}                  location    - City / locality of the property.
 * @property {string}                  country     - Country where the property is located.
 * @property {string}                  category    - Category tag (must be one of the enum values).
 * @property {mongoose.Types.ObjectId[]} reviews   - Array of Review references.
 * @property {mongoose.Types.ObjectId} owner       - Reference to the User who owns the listing.
 */
const listingSchema = new Schema({
    title: {
        type: String,
        required: true,
    },
    description: {
        type: String,
    },
    image: {
        url: String,
        filename: String,
    },
    price: {
        type: Number,
    },
    location: {
        type: String,
    },
    country: {
        type: String,
    },
    category: {
        type: String,
        enum: [
            "Trending",
            "Rooms",
            "Iconic Cities",
            "Mountains",
            "Castles",
            "Amazing Pools",
            "Camping",
            "Farms",
            "Doms",
            "Boats",
            "Historical Homes",
        ],
        required: true,
    },
    reviews: [
        {
            type: Schema.Types.ObjectId,
            ref: "Review",
        },
    ],
    owner: {
        type: Schema.Types.ObjectId,
        ref: "User",
    },
});

/**
 * Post-delete hook: When a Listing is deleted via findOneAndDelete,
 * all Review documents referenced by that listing are also removed.
 * This prevents orphaned Review documents from accumulating in the database.
 *
 * @param {Object} listing - The deleted listing document.
 */
listingSchema.post("findOneAndDelete", async (listing) => {
    if (listing) {
        await Review.deleteMany({ _id: { $in: listing.reviews } });
    }
});

const Listing = mongoose.model("Listing", listingSchema);
module.exports = Listing;
