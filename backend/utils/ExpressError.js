/**
 * Custom error class for Express application errors.
 *
 * Extends the native Error class to carry an HTTP status code alongside
 * the error message. Used by route handlers and middleware to signal
 * known error conditions (e.g. 404 Not Found, 400 Bad Request) to the
 * centralised error-handling middleware in app.js.
 *
 * @class ExpressError
 * @extends Error
 *
 * @param {number} statusCode - The HTTP status code to send to the client.
 * @param {string} message    - A human-readable description of the error.
 *
 * @example
 * throw new ExpressError(404, "Page Not Found!");
 */
class ExpressError extends Error {
    constructor(statusCode, message) {
        super(message); // Pass message to native Error so err.message is set correctly
        this.statusCode = statusCode;
        this.message = message;
    }
}

module.exports = ExpressError;