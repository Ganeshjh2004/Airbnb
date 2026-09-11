const Listing = require("../models/listing.js");

/**
 * Controller: Renders the listings index page.
 *
 * Fetches all listing documents from MongoDB and renders them on the index
 * page. No filtering is applied here — category and search filtering are
 * handled by dedicated routes in app.js.
 *
 * @async
 * @param {import("express").Request}  req
 * @param {import("express").Response} res
 */
module.exports.index = async (req, res) => {
    const allListings = await Listing.find({});
    res.render("listings/index.ejs", { allListings });
};

/**
 * Controller: Renders the "Create New Listing" form.
 *
 * @param {import("express").Request}  req
 * @param {import("express").Response} res
 */
module.exports.renderNewForm = (req, res) => {
    res.render("listings/new.ejs");
};

/**
 * Controller: Renders the detail page for a single listing.
 *
 * Fetches the listing by ID and populates:
 *  - reviews → author (so the review author's username is available in the view)
 *  - owner (so the listing owner's username is available in the view)
 *
 * @async
 * @param {import("express").Request}  req - Must contain req.params.id.
 * @param {import("express").Response} res
 */
module.exports.showListing = async (req, res) => {
    const { id } = req.params;
    const listing1 = await Listing.findById(id)
        .populate({
            path: "reviews",
            populate: { path: "author" },
        })
        .populate("owner");

    if (!listing1) {
        // BUG FIX 1: Was flashing "success" — should be "error" for a not-found case.
        // BUG FIX 2: Was missing `return` — without it, res.redirect() was called
        //   but execution continued to res.render() below, causing a
        //   "Cannot set headers after they are sent" crash.
        req.flash("error", "The listing you requested does not exist.");
        return res.redirect("/listings");
    }

    res.render("listings/show.ejs", { listing1 });
};

/**
 * Controller: Creates a new listing and saves it to the database.
 *
 * The image file is uploaded to Cloudinary by the multer middleware before
 * this controller runs. req.file contains the Cloudinary response with
 * `path` (the public URL) and `filename` (the Cloudinary public_id).
 *
 * @async
 * @param {import("express").Request}  req - Body: { listing: {...} }, File: req.file
 * @param {import("express").Response} res
 * @param {import("express").NextFunction} next
 */
module.exports.createListing = async (req, res, next) => {
    const url = req.file.path;        // Cloudinary public URL
    // BUG FIX: Was `req.file.path` for both url AND filename. The filename
    // should be `req.file.filename` (the Cloudinary public_id used for
    // managing/deleting the image). Using path for both meant the public_id
    // was never stored, making it impossible to delete or transform images later.
    const filename = req.file.filename; // Cloudinary public_id

    const newListing = new Listing(req.body.listing);
    newListing.owner = req.user._id;
    newListing.image = { url, filename };

    await newListing.save();
    req.flash("success", "New listing created successfully!");
    res.redirect("/listings");
};

/**
 * Controller: Renders the edit form for an existing listing.
 *
 * Fetches the listing and generates a width-constrained preview URL for the
 * current image by inserting a Cloudinary transformation into the URL.
 *
 * @async
 * @param {import("express").Request}  req - Must contain req.params.id.
 * @param {import("express").Response} res
 */
module.exports.editListing = async (req, res) => {
    const { id } = req.params;
    const listing = await Listing.findById(id);

    if (!listing) {
        req.flash("error", "The listing you requested does not exist.");
        return res.redirect("/listings");
    }

    // Generate a smaller preview image URL for display in the edit form
    // by inserting a Cloudinary width transformation into the URL if available
    let originalImageUrl = listing.image ? listing.image.url : "";
    if (originalImageUrl) {
        originalImageUrl = originalImageUrl.replace("/upload", "/upload/w_250");
    }

    res.render("listings/edit.ejs", { Listing: listing, originalImageUrl });
};

/**
 * Controller: Updates an existing listing's fields in the database.
 *
 * If a new image file is provided, the Cloudinary URL and filename are updated.
 * If no new file is uploaded, the existing image is retained unchanged.
 *
 * @async
 * @param {import("express").Request}  req - Body: { listing: {...} }, Optional File: req.file
 * @param {import("express").Response} res
 */
module.exports.updateListing = async (req, res) => {
    const { id } = req.params;

    // Apply updated fields from the form; spread merges them into the document
    const updatedListing = await Listing.findByIdAndUpdate(id, {
        ...req.body.listing,
    });

    // Only update the image if a new file was uploaded
    if (typeof req.file !== "undefined") {
        const url = req.file.path;
        const filename = req.file.filename;
        updatedListing.image = { url, filename };
        await updatedListing.save();
    }

    req.flash("success", "Listing updated successfully!");
    res.redirect(`/listings/${id}`);
};

/**
 * Controller: Deletes a listing from the database.
 *
 * The associated reviews are automatically deleted via the post-hook on the
 * Listing schema (findOneAndDelete triggers the hook; findByIdAndDelete does too
 * because it calls findOneAndDelete internally).
 *
 * @async
 * @param {import("express").Request}  req - Must contain req.params.id.
 * @param {import("express").Response} res
 */
module.exports.destroyListing = async (req, res) => {
    const { id } = req.params;
    await Listing.findByIdAndDelete(id);
    req.flash("success", "Listing deleted successfully.");
    res.redirect("/listings");
};