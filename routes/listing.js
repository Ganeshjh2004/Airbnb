const express = require("express");
const router = express.Router();
const wrapAsync = require("../utils/wrapAsyc.js");
const { isLoggedIn, isOwner, validateListing } = require("../middleware.js");
const listingController = require("../controllers/listings.js");
const multer = require("multer");
const { storage } = require("../cloudConfig.js");

/**
 * Multer instance configured to upload files directly to Cloudinary.
 * `storage` is the CloudinaryStorage engine defined in cloudConfig.js.
 */
const upload = multer({ storage });

/**
 * GET  /listings       — Show all listings (index)
 * POST /listings       — Create a new listing (requires login + valid body + image upload)
 */
router
    .route("/")
    .get(wrapAsync(listingController.index))
    .post(
        isLoggedIn,
        upload.single("listing[image]"), // Upload image to Cloudinary before validation
        validateListing,
        wrapAsync(listingController.createListing)
    );

/**
 * GET /listings/new — Render the new-listing form (requires login).
 * Must be defined BEFORE /:id routes so "new" is not treated as an ID.
 */
router.get("/new", isLoggedIn, listingController.renderNewForm);

/**
 * GET    /listings/:id — Show a single listing
 * PUT    /listings/:id — Update a listing (requires login + ownership + valid body)
 * DELETE /listings/:id — Delete a listing (requires login + ownership)
 */
router
    .route("/:id")
    .get(wrapAsync(listingController.showListing))
    .put(
        isLoggedIn,
        isOwner,
        upload.single("listing[image]"), // Optional new image; handled in controller
        validateListing,
        wrapAsync(listingController.updateListing)
    )
    .delete(isLoggedIn, isOwner, wrapAsync(listingController.destroyListing));

/**
 * GET /listings/:id/edit — Render the edit form for a listing (requires login + ownership).
 */
router.get(
    "/:id/edit",
    isLoggedIn,
    isOwner,
    wrapAsync(listingController.editListing)
);

module.exports = router;