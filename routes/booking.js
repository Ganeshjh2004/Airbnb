const express = require('express');
const router = express.Router();
const ejs = require('ejs');
const puppeteer = require('puppeteer');
const path = require('path');
const bookingController = require('../controllers/bookingController');
const Booking = require('../models/Booking'); // adjust path if needed

// Middleware to check login
const isLoggedIn = (req, res, next) => {
    if (!req.isAuthenticated()) {
        return res.redirect('/login');
    }
    next();
};

// ===================
// Existing booking routes
// ===================

router.post('/listings/:id/book', isLoggedIn, bookingController.bookListing);
router.post('/verify-payment', isLoggedIn, bookingController.verifyPayment);
router.get('/bookings/:bookingId/success', isLoggedIn, bookingController.bookingSuccess);

// ===================
// New invoice download route
// ===================

router.get('/bookings/:id/invoice.pdf', isLoggedIn, async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.id)
            .populate('user')
            .populate('listing');

        if (!booking) {
            return res.status(404).send('Booking not found');
        }

        // Render the EJS template to HTML
        const html = await ejs.renderFile(
            path.join(__dirname, '../views/listings/invoice.ejs'),
            { booking }
        );

        // Use Puppeteer to convert HTML to PDF
        const browser = await puppeteer.launch({
            headless: "new",
            args: ["--no-sandbox", "--disable-setuid-sandbox"]
        });
        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: 'networkidle0' });

        const pdfBuffer = await page.pdf({ format: 'A4' });
        await browser.close();

        // Send PDF as response
        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename=booking-${booking._id}.pdf`,
        });
        res.send(pdfBuffer);

    } catch (err) {
        console.error('Error generating PDF invoice:', err);
        res.status(500).send('Something went wrong generating the invoice');
    }
});

module.exports = router;
