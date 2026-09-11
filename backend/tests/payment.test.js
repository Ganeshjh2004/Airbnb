/**
 * tests/payment.test.js
 *
 * Tests for POST /verify-payment:
 *  1. Valid HMAC signature → booking marked "paid", returns { success: true }
 *  2. Invalid signature     → 400 { success: false, error: "Invalid payment signature." }
 *  3. Non-owner user        → 403 { success: false, error: "Unauthorized." }
 *
 * Mocks:
 *  - config/razorpay    → prevents Razorpay SDK from requiring real env vars
 *  - utils/pdfGenerator → prevents Puppeteer from launching
 *  - nodemailer         → prevents real email sending
 */

// ── Mocks (must appear before imports) ───────────────────────────────────────

jest.mock("../config/razorpay", () => ({
  orders: {
    create: jest.fn().mockResolvedValue({
      id: "order_test_abc",
      amount: 100000,
      currency: "INR",
    }),
  },
}));

jest.mock("nodemailer", () => ({
  createTransport: jest.fn().mockReturnValue({
    sendMail: jest.fn().mockResolvedValue({ messageId: "fake-message-id" }),
  }),
}));

jest.mock("../utils/pdfGenerator", () =>
  jest.fn().mockResolvedValue(Buffer.from("fake-pdf-content"))
);

// ── Imports ───────────────────────────────────────────────────────────────────

const crypto = require("crypto");
const Session = require("supertest-session");
const db = require("./helpers/db");
const createApp = require("./helpers/createApp");
const User = require("../models/user");
const Listing = require("../models/listing");
const Booking = require("../models/Booking");

let app;

beforeAll(async () => {
  await db.connect();
  app = createApp();
});

afterEach(async () => {
  await db.clearDatabase();
});

afterAll(async () => {
  await db.closeDatabase();
});

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Registers and logs in a user. Returns the logged-in session.
 */
async function registerAndLogin(username, email, password) {
  const sess = Session(app);
  await sess.post("/signup").type("form").send({ username, email, password });
  return sess;
}

/**
 * Creates a Listing owned by `userId`.
 */
async function createListing(userId) {
  const listing = new Listing({
    title: "Test Villa",
    description: "A test villa.",
    location: "Mumbai",
    country: "India",
    price: 3000,
    category: "Trending",
    image: { url: "http://example.com/villa.jpg", filename: "villa.jpg" },
    owner: userId,
  });
  await listing.save();
  return listing;
}

/**
 * Creates a pending Booking in the DB.
 */
async function createPendingBooking(userId, listingId, razorpayOrderId) {
  const booking = new Booking({
    listing: listingId,
    user: userId,
    checkIn: new Date("2025-12-01"),
    checkOut: new Date("2025-12-05"),
    totalAmount: 12000,
    paymentStatus: "pending",
    razorpayOrderId,
  });
  await booking.save();
  return booking;
}

/**
 * Computes the HMAC-SHA256 signature exactly as the server does.
 */
function computeSignature(orderId, paymentId, secret) {
  return crypto
    .createHmac("sha256", secret)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("POST /verify-payment", () => {
  const RAZORPAY_SECRET = "fake_razorpay_secret"; // must match createApp.js env stub
  const ORDER_ID = "order_test_abc";
  const PAYMENT_ID = "pay_test_xyz";

  it("marks booking as paid and returns { success: true } for a valid HMAC", async () => {
    const sess = await registerAndLogin("payer1", "payer1@example.com", "pass1234");
    const user = await User.findOne({ username: "payer1" });
    const listing = await createListing(user._id);
    const booking = await createPendingBooking(user._id, listing._id, ORDER_ID);

    const signature = computeSignature(ORDER_ID, PAYMENT_ID, RAZORPAY_SECRET);

    const res = await sess
      .post("/verify-payment")
      .send({
        razorpay_order_id: ORDER_ID,
        razorpay_payment_id: PAYMENT_ID,
        razorpay_signature: signature,
        bookingId: booking._id.toString(),
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.redirect).toMatch(new RegExp(`/bookings/${booking._id}/success`));

    // Confirm DB was updated
    const updated = await Booking.findById(booking._id);
    expect(updated.paymentStatus).toBe("paid");
    expect(updated.razorpayPaymentId).toBe(PAYMENT_ID);
  });

  it("returns 400 for an invalid HMAC signature", async () => {
    const sess = await registerAndLogin("payer2", "payer2@example.com", "pass1234");
    const user = await User.findOne({ username: "payer2" });
    const listing = await createListing(user._id);
    const booking = await createPendingBooking(user._id, listing._id, ORDER_ID);

    const res = await sess
      .post("/verify-payment")
      .send({
        razorpay_order_id: ORDER_ID,
        razorpay_payment_id: PAYMENT_ID,
        razorpay_signature: "totally_wrong_signature_xxxx",
        bookingId: booking._id.toString(),
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe("Invalid payment signature.");

    // Booking should still be pending
    const unchanged = await Booking.findById(booking._id);
    expect(unchanged.paymentStatus).toBe("pending");
  });

  it("returns 403 when a non-owner sends a valid signature for someone else's booking", async () => {
    // Create the legitimate owner + booking
    const ownerSess = await registerAndLogin("realPayer", "realpayer@example.com", "pass1234");
    const owner = await User.findOne({ username: "realPayer" });
    const listing = await createListing(owner._id);
    const booking = await createPendingBooking(owner._id, listing._id, ORDER_ID);

    // The attacker logs in as a different user
    const attackerSess = await registerAndLogin(
      "attacker",
      "attacker@example.com",
      "pass1234"
    );

    // Compute the real valid signature (attacker somehow obtained it)
    const signature = computeSignature(ORDER_ID, PAYMENT_ID, RAZORPAY_SECRET);

    const res = await attackerSess
      .post("/verify-payment")
      .send({
        razorpay_order_id: ORDER_ID,
        razorpay_payment_id: PAYMENT_ID,
        razorpay_signature: signature,
        bookingId: booking._id.toString(),
      });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe("Unauthorized.");

    // Booking must remain pending
    const unchanged = await Booking.findById(booking._id);
    expect(unchanged.paymentStatus).toBe("pending");
  });

  it("redirects unauthenticated users to /login", async () => {
    const res = await Session(app)
      .post("/verify-payment")
      .send({
        razorpay_order_id: ORDER_ID,
        razorpay_payment_id: PAYMENT_ID,
        razorpay_signature: "sig",
        bookingId: "64b9f1234567890123456789",
      });

    expect(res.status).toBe(302);
    expect(res.headers.location).toMatch(/\/login/);
  });
});
