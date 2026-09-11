const passport = require("passport");
const LocalStrategy = require("passport-local");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const User = require("./models/user");
const Admin = require("./models/Admin");

/**
 * Configures Passport.js authentication strategies and session serialisation.
 *
 * This file is required once in app.js after the User and Admin models are loaded.
 * It sets up:
 *  1. Local Strategy       — username/password for User via passport-local-mongoose
 *  2. Admin Local Strategy — username/password for Admin via passport-local-mongoose ("admin-local")
 *  3. Google Strategy      — OAuth 2.0 via passport-google-oauth20
 *
 * Required environment variables:
 *  - GOOGLE_CLIENT_ID    : Google OAuth app client ID
 *  - GOOGLE_CLIENT_SECRET: Google OAuth app client secret
 *  - GOOGLE_CALLBACK_URL : Absolute URL of the OAuth callback endpoint
 */

// ─── Local Strategy (User) ────────────────────────────────────────────────────

/**
 * Delegates username/password authentication to passport-local-mongoose,
 * which handles hashing and comparison internally using the User model's
 * authenticate() method.
 */
passport.use(new LocalStrategy(User.authenticate()));

// ─── Admin Local Strategy ───────────────────────────────────────────────────

/**
 * Delegates administrator authentication to the Admin model.
 * Registered under the name "admin-local" to prevent conflicts with the default "local"
 * strategy used for regular users.
 */
passport.use("admin-local", new LocalStrategy(Admin.authenticate()));

// ─── Google OAuth 2.0 Strategy ───────────────────────────────────────────────

/**
 * Handles Google OAuth 2.0 login flow.
 *
 * On first login, a new User document is created using the Google profile data.
 * On subsequent logins, the existing user is looked up by their googleId.
 *
 * @param {string}   accessToken  - OAuth access token (not stored; not needed after login).
 * @param {string}   refreshToken - OAuth refresh token (not stored; not needed here).
 * @param {Object}   profile      - Google profile object containing id, displayName, emails, etc.
 * @param {Function} done         - Passport callback: done(err, user)
 */
passport.use(
    new GoogleStrategy(
        {
            clientID: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            callbackURL: process.env.GOOGLE_CALLBACK_URL,
        },
        async (accessToken, refreshToken, profile, done) => {
            try {
                // Look up an existing user by their Google profile ID
                let user = await User.findOne({ googleId: profile.id });

                if (!user) {
                    // First-time Google login: create a new user record
                    user = await User.create({
                        username: profile.displayName,
                        googleId: profile.id,
                        email: profile.emails[0].value,
                    });
                }

                return done(null, user);
            } catch (err) {
                return done(err, null);
            }
        }
    )
);

// ─── Session Serialisation ───────────────────────────────────────────────────

/**
 * Serialises the authenticated user or admin into the session.
 * Stores { id, type } so deserializeUser knows whether to query User or Admin.
 *
 * @param {Object}   user - The authenticated user or admin document.
 * @param {Function} done - Passport callback: done(err, sessionData)
 */
passport.serializeUser((user, done) => {
    const isModelAdmin =
        user instanceof Admin ||
        (user.constructor && user.constructor.modelName === "Admin");

    done(null, {
        id: user.id,
        type: isModelAdmin ? "Admin" : "User",
    });
});

/**
 * Deserialises the user from the session on each subsequent request.
 * Fetches the document from MongoDB using the stored id and model type.
 * Includes a backwards-compatible fallback if an id string was stored.
 *
 * @param {Object|string} sessionData - The serialised session data { id, type } or string id.
 * @param {Function}      done        - Passport callback: done(err, user)
 */
passport.deserializeUser(async (sessionData, done) => {
    try {
        if (sessionData && typeof sessionData === "object" && sessionData.type === "Admin") {
            const admin = await Admin.findById(sessionData.id);
            return done(null, admin);
        }

        const id = sessionData && typeof sessionData === "object" ? sessionData.id : sessionData;
        const user = await User.findById(id);
        if (user) {
            return done(null, user);
        }

        // Fallback for Admin stored as plain id
        const admin = await Admin.findById(id);
        return done(null, admin);
    } catch (err) {
        done(err, null);
    }
});
