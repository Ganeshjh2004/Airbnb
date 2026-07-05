const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");

/**
 * Configures the Cloudinary SDK using credentials from environment variables.
 * Must be called before any Cloudinary API operations.
 *
 * Required environment variables:
 *  - CLOUD_NAME      : Your Cloudinary cloud name
 *  - CLOUD_API_KEY   : Your Cloudinary API key
 *  - CLOUD_API_SECRET: Your Cloudinary API secret
 */
cloudinary.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.CLOUD_API_KEY,
    api_secret: process.env.CLOUD_API_SECRET,
});

/**
 * Multer storage engine backed by Cloudinary.
 *
 * Uploaded files are stored in the "wanderlust_DEV" folder on Cloudinary.
 * Only PNG, JPG, and JPEG files are accepted.
 *
 * BUG FIX: `allowerdFormats` was a typo of `allowedFormats`. Because of the
 * typo, multer-storage-cloudinary received an unknown option and silently
 * ignored it, meaning files of ANY type (PDF, SVG, executable, etc.) could
 * be uploaded. Fixed to `allowedFormats` to enforce the whitelist.
 *
 * @type {CloudinaryStorage}
 */
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: "wanderlust_DEV",
        allowedFormats: ["png", "jpg", "jpeg"], // Enforce image-only uploads
    },
});

module.exports = {
    cloudinary,
    storage,
};
