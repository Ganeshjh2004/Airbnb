const Listing = require("../../models/listing");
const Admin = require("../../models/Admin");

/**
 * Middleware: Ensures the request is made by an authenticated user.
 * Returns 401 JSON if not logged in.
 */
module.exports.apiIsLoggedIn = (req, res, next) => {
    if (!req.isAuthenticated()) {
        return res
            .status(401)
            .json({ error: "You must be logged in to perform this action." });
    }
    next();
};

/**
 * Middleware: Ensures the current user is the owner of the listing (or an admin).
 * Returns 404 if listing doesn't exist, 403 if unauthorized.
 */
module.exports.apiIsOwner = async (req, res, next) => {
    const { id } = req.params;
    const listing = await Listing.findById(id);

    if (!listing) {
        return res.status(404).json({ error: "Listing not found." });
    }

    const isAdmin =
        req.isAuthenticated() &&
        (req.user instanceof Admin ||
            (req.user &&
                req.user.constructor &&
                req.user.constructor.modelName === "Admin"));

    if (isAdmin) {
        req.listing = listing;
        return next();
    }

    if (!req.user || !listing.owner || !listing.owner.equals(req.user._id)) {
        return res
            .status(403)
            .json({ error: "You do not have permission to do that." });
    }

    req.listing = listing;
    next();
};

/**
 * Middleware: Ensures the request is made by an authenticated administrator.
 * Returns 403 JSON if not an admin.
 */
module.exports.apiIsAdminLoggedIn = (req, res, next) => {
    const isAdmin =
        req.isAuthenticated() &&
        (req.user instanceof Admin ||
            (req.user &&
                req.user.constructor &&
                req.user.constructor.modelName === "Admin"));

    if (!isAdmin) {
        return res
            .status(403)
            .json({ error: "Access denied. Administrator privileges required." });
    }
    next();
};
