const passport = require("passport");
const LocalStrategy = require("passport-local");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const User = require("./models/user");

/**
 * Configures Passport.js authentication strategies and session serialisation.
 *
 * This file is required once in app.js after the User model is loaded.
 * It sets up:
 *  1. Local Strategy  — username/password via passport-local-mongoose
 *  2. Google Strategy — OAuth 2.0 via passport-google-oauth20
 *
 * Required environment variables:
 *  - GOOGLE_CLIENT_ID    : Google OAuth app client ID
 *  - GOOGLE_CLIENT_SECRET: Google OAuth app client secret
 *  - GOOGLE_CALLBACK_URL : Absolute URL of the OAuth callback endpoint
 */

// ─── Local Strategy ───────────────────────────────────────────────────────────

/**
 * Delegates username/password authentication to passport-local-mongoose,
 * which handles hashing and comparison internally using the User model's
 * authenticate() method.
 */
passport.use(new LocalStrategy(User.authenticate()));

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
 * Serialises the authenticated user into the session.
 * Only the user's MongoDB _id is stored in the session cookie to minimise
 * session payload size.
 *
 * @param {Object}   user - The authenticated user document.
 * @param {Function} done - Passport callback: done(err, id)
 */
passport.serializeUser((user, done) => {
    done(null, user.id);
});

/**
 * Deserialises the user from the session on each subsequent request.
 * Fetches the full user document from MongoDB using the stored _id.
 *
 * @param {string}   id   - The serialised user ID from the session.
 * @param {Function} done - Passport callback: done(err, user)
 */
passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (err) {
        done(err, null);
    }
});
