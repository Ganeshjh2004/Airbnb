const puppeteer = require("puppeteer");
const ejs = require("ejs");
const path = require("path");

/**
 * Generates a PDF booking invoice using Puppeteer and an EJS template.
 *
 * The process:
 *  1. Renders the `views/listings/invoice.ejs` template with the booking data
 *     into an HTML string.
 *  2. Launches a headless Chromium instance via Puppeteer.
 *  3. Loads the HTML into a new page and exports it as a PDF buffer.
 *  4. Closes the browser and returns the buffer.
 *
 * The returned buffer is used in bookingController.js both as an email
 * attachment (via nodemailer) and as a direct download from the invoice route.
 *
 * @async
 * @param {Object} bookingData             - A populated Booking document.
 * @param {Object} bookingData.user        - Populated User sub-document.
 * @param {Object} bookingData.listing     - Populated Listing sub-document.
 * @param {Date}   bookingData.checkIn     - Check-in date.
 * @param {Date}   bookingData.checkOut    - Check-out date.
 * @param {number} bookingData.totalAmount - Total booking cost.
 * @returns {Promise<Buffer>} A Buffer containing the generated PDF bytes.
 * @throws {Error} If Puppeteer fails to launch or generate the PDF.
 */
async function generateBookingPDF(bookingData) {
    // Render the EJS invoice template to an HTML string
    const html = await ejs.renderFile(
        path.join(__dirname, "..", "views", "listings", "invoice.ejs"),
        { booking: bookingData }
    );

    // Launch headless Chromium
    // NOTE: headless: "new" uses the modern headless mode (Puppeteer v22+).
    // The old headless: true mode is deprecated and prints a deprecation warning.
    const browser = await puppeteer.launch({
        headless: "new",
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();

    // Load the HTML and wait until all network requests settle (fonts, images)
    await page.setContent(html, { waitUntil: "networkidle0" });

    // Export to PDF (A4, with small margins for a professional look)
    const pdfBuffer = await page.pdf({
        format: "A4",
        printBackground: true,
        margin: { top: "20px", bottom: "20px", left: "20px", right: "20px" },
    });

    await browser.close();
    return pdfBuffer;
}

module.exports = generateBookingPDF;
