const Listing = require("../../models/listing");

/**
 * GET /api/listings
 * Fetches all listings, with optional search query and category filtering.
 */
module.exports.index = async (req, res) => {
    try {
        const { search, category } = req.query;
        let filter = {};

        if (category) {
            filter.category = { $regex: new RegExp(`^${category}$`, "i") };
        }

        if (search && search.trim()) {
            const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
            filter.$or = [
                { title: { $regex: escaped, $options: "i" } },
                { country: { $regex: escaped, $options: "i" } },
                { location: { $regex: escaped, $options: "i" } },
                { description: { $regex: escaped, $options: "i" } },
            ];
        }

        const listings = await Listing.find(filter).populate(
            "owner",
            "username email"
        );
        return res.json(listings);
    } catch (err) {
        console.error("API index listings error:", err);
        return res.status(500).json({ error: "Failed to fetch listings." });
    }
};

/**
 * GET /api/listings/:id
 * Fetches a single listing by ID with populated reviews and owner details.
 */
module.exports.showListing = async (req, res) => {
    try {
        const { id } = req.params;
        const listing = await Listing.findById(id)
            .populate({
                path: "reviews",
                populate: { path: "author", select: "username email" },
            })
            .populate("owner", "username email");

        if (!listing) {
            return res.status(404).json({ error: "Listing not found." });
        }

        return res.json(listing);
    } catch (err) {
        console.error("API show listing error:", err);
        return res.status(500).json({ error: "Failed to fetch listing." });
    }
};

/**
 * POST /api/listings
 * Creates a new listing for the authenticated user.
 */
module.exports.createListing = async (req, res) => {
    try {
        const data = req.body.listing || req.body;
        const newListing = new Listing(data);
        newListing.owner = req.user._id;

        if (req.file) {
            newListing.image = {
                url: req.file.path,
                filename: req.file.filename,
            };
        } else if (data.image) {
            if (typeof data.image === "string") {
                newListing.image = { url: data.image, filename: "listingimage" };
            } else if (data.image.url) {
                newListing.image = data.image;
            }
        }

        await newListing.save();
        return res.status(201).json(newListing);
    } catch (err) {
        console.error("API create listing error:", err);
        return res
            .status(400)
            .json({ error: err.message || "Failed to create listing." });
    }
};

/**
 * PUT /api/listings/:id
 * Updates an existing listing.
 */
module.exports.updateListing = async (req, res) => {
    try {
        const { id } = req.params;
        const data = req.body.listing || req.body;

        const updatedListing = await Listing.findByIdAndUpdate(
            id,
            { ...data },
            { new: true, runValidators: true }
        );

        if (!updatedListing) {
            return res.status(404).json({ error: "Listing not found." });
        }

        if (req.file) {
            updatedListing.image = {
                url: req.file.path,
                filename: req.file.filename,
            };
            await updatedListing.save();
        }

        return res.json(updatedListing);
    } catch (err) {
        console.error("API update listing error:", err);
        return res
            .status(400)
            .json({ error: err.message || "Failed to update listing." });
    }
};

/**
 * DELETE /api/listings/:id
 * Deletes a listing and cleans up associated reviews.
 */
module.exports.destroyListing = async (req, res) => {
    try {
        const { id } = req.params;
        const deleted = await Listing.findByIdAndDelete(id);

        if (!deleted) {
            return res.status(404).json({ error: "Listing not found." });
        }

        return res.json({
            success: true,
            message: "Listing deleted successfully.",
        });
    } catch (err) {
        console.error("API destroy listing error:", err);
        return res.status(500).json({ error: "Failed to delete listing." });
    }
};
