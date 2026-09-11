const express = require("express");
const router = express.Router();
const multer = require("multer");
const { storage } = require("../../cloudConfig.js");
const listingsController = require("../../controllers/api/listingsController");
const { apiIsLoggedIn, apiIsOwner } = require("./middleware");

const upload = multer({ storage });

/**
 * Flexible multer middleware supporting field name "image", "listing[image]",
 * or JSON requests without file attachments.
 */
const handleUpload = (req, res, next) => {
    upload.any()(req, res, (err) => {
        if (err) {
            return next(err);
        }
        if (req.files && req.files.length > 0) {
            req.file = req.files[0];
        }
        next();
    });
};

/**
 * GET  /api/listings - Retrieve all listings
 * POST /api/listings - Create listing (authenticated)
 */
router
    .route("/")
    .get(listingsController.index)
    .post(apiIsLoggedIn, handleUpload, listingsController.createListing);

/**
 * GET    /api/listings/:id - Retrieve single listing
 * PUT    /api/listings/:id - Update listing (owner only)
 * DELETE /api/listings/:id - Delete listing (owner only)
 */
router
    .route("/:id")
    .get(listingsController.showListing)
    .put(apiIsLoggedIn, apiIsOwner, handleUpload, listingsController.updateListing)
    .delete(apiIsLoggedIn, apiIsOwner, listingsController.destroyListing);

module.exports = router;
