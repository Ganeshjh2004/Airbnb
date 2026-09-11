const mongoose = require("mongoose");
const passportLocalMongoose = require("passport-local-mongoose");

/**
 * Mongoose schema for a User account.
 *
 * Supports two authentication methods:
 *  1. **Local** — username + hashed password managed by passport-local-mongoose.
 *  2. **Google OAuth 2.0** — identified via googleId from the Google profile.
 *
 * The `email` and `googleId` fields use `sparse: true` so that a unique index
 * is only enforced on documents that actually have those fields set (allowing
 * null/undefined for users who registered via the other method).
 *
 * passport-local-mongoose automatically adds:
 *  - `username` field (if not already defined)
 *  - `hash` and `salt` fields for password storage
 *  - `authenticate()`, `serializeUser()`, `deserializeUser()` statics and methods
 *
 * @typedef {Object} User
 * @property {string} username  - Display name; used for local login and shown on listings/reviews.
 * @property {string} email     - Unique email address; sparse index allows Google-only users without email.
 * @property {string} googleId  - Google profile ID; sparse unique index for OAuth users.
 */
const userSchema = new mongoose.Schema(
    {
        username: {
            type: String,
            trim: true,
        },
        email: {
            type: String,
            unique: true,
            sparse: true, // Allows multiple documents without email (Google OAuth users)
            trim: true,
        },
        googleId: {
            type: String,
            unique: true,
            sparse: true, // Allows multiple documents without googleId (local-auth users)
        },
    },
    { timestamps: true }
);

// Adds local authentication fields (hash, salt) and helper methods to the schema
userSchema.plugin(passportLocalMongoose);

module.exports = mongoose.model("User", userSchema);
