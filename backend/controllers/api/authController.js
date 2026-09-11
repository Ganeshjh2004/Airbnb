const User = require("../../models/user");
const Admin = require("../../models/Admin");
const passport = require("passport");

/**
 * POST /api/auth/signup
 * Registers a new user and logs them in via session.
 */
module.exports.signup = async (req, res, next) => {
    try {
        const { username, email, password } = req.body;
        if (!username || !email || !password) {
            return res.status(400).json({
                error: "Username, email, and password are required.",
            });
        }

        const newUser = new User({ email, username });
        const registeredUser = await User.register(newUser, password);

        req.login(registeredUser, (err) => {
            if (err) {
                return next(err);
            }
            return res.status(201).json({
                success: true,
                user: {
                    _id: registeredUser._id,
                    username: registeredUser.username,
                    email: registeredUser.email,
                },
            });
        });
    } catch (err) {
        return res.status(400).json({ error: err.message });
    }
};

/**
 * POST /api/auth/login
 * Authenticates user credentials using Passport LocalStrategy and establishes session.
 */
module.exports.login = (req, res, next) => {
    passport.authenticate("local", (err, user, info) => {
        if (err) {
            return next(err);
        }
        if (!user) {
            return res.status(401).json({
                error: info?.message || "Invalid username or password.",
            });
        }
        req.login(user, (err) => {
            if (err) {
                return next(err);
            }
            return res.json({
                success: true,
                user: {
                    _id: user._id,
                    username: user.username,
                    email: user.email,
                },
            });
        });
    })(req, res, next);
};

/**
 * POST /api/auth/logout
 * Destroys current user session.
 */
module.exports.logout = (req, res, next) => {
    req.logout((err) => {
        if (err) {
            return next(err);
        }
        return res.json({
            success: true,
            message: "Logged out successfully.",
        });
    });
};

/**
 * GET /api/auth/me
 * Returns profile information of the currently authenticated user.
 */
module.exports.me = (req, res) => {
    if (!req.isAuthenticated()) {
        return res
            .status(401)
            .json({ user: null, error: "Not authenticated." });
    }

    const isAdmin =
        req.user instanceof Admin ||
        (req.user &&
            req.user.constructor &&
            req.user.constructor.modelName === "Admin");

    return res.json({
        user: {
            _id: req.user._id,
            username: req.user.username,
            email: req.user.email,
            role: isAdmin ? "admin" : "user",
        },
    });
};
