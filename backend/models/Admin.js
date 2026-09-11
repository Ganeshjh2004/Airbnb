const mongoose = require("mongoose");
const passportLocalMongoose = require("passport-local-mongoose");

/**
 * Mongoose schema for Administrator accounts.
 *
 * Stored in a separate "admins" collection (completely isolated from "users").
 * Uses passport-local-mongoose for salted PBKDF2 password hashing and local authentication.
 *
 * @typedef {Object} Admin
 * @property {string} username - Administrator username
 */
const adminSchema = new mongoose.Schema(
    {
        username: {
            type: String,
            required: true,
            unique: true,
            trim: true,
        },
    },
    { timestamps: true }
);

// Add virtual marker so admin documents can easily be identified
adminSchema.virtual("isAdmin").get(function () {
    return true;
});

adminSchema.set("toObject", { virtuals: true });
adminSchema.set("toJSON", { virtuals: true });

// Plugin passport-local-mongoose for password hash & salt handling + authenticate()
adminSchema.plugin(passportLocalMongoose);

module.exports = mongoose.model("Admin", adminSchema, "admins");
