const puppeteer = require('puppeteer');
const ejs = require('ejs');
const path = require('path');

async function generateBookingPDF(bookingData) {
    // Load EJS template into HTML string
    const html = await ejs.renderFile(
        path.join(__dirname, '..', 'views', 'listings', 'invoice.ejs'),
        { booking: bookingData }
    );

    // Launch headless browser
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });

    // Generate PDF
    const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '20px', bottom: '20px', left: '20px', right: '20px' }
    });

    await browser.close();
    return pdfBuffer;
}

module.exports = generateBookingPDF;

