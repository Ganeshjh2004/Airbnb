/**
 * tests/booking.test.js
 *
 * Tests for the booking creation flow:
 *  1. Valid date range (checkOut > checkIn) → booking created, payment page rendered
 *  2. checkOut <= checkIn → flash error, redirect back to listing
 *  3. Unauthenticated request → redirect to /login
 *
 * The Razorpay SDK is mocked so no real network calls are made.
 * nodemailer and pdfGenerator are also mocked to prevent side effects.
 */

// ── Mocks (must be declared before any imports that require those modules) ────

// Mock the Razorpay singleton so orders.create() resolves instantly
jest.mock("../config/razorpay", () => ({
  orders: {
    create: jest.fn().mockResolvedValue({
      id: "order_test_123",
      amount: 200000,
      currency: "INR",
    }),
  },
}));

// Mock nodemailer to prevent real email sending
jest.mock("nodemailer", () => ({
  createTransport: jest.fn().mockReturnValue({
    sendMail: jest.fn().mockResolvedValue({ messageId: "fake-id" }),
  }),
}));

// Mock pdfGenerator to return a fake buffer (avoids spawning Puppeteer)
jest.mock("../utils/pdfGenerator", () =>
  jest.fn().mockResolvedValue(Buffer.from("fake-pdf"))
);

// ── Imports ───────────────────────────────────────────────────────────────────

const Session = require("supertest-session");
const db = require("./helpers/db");
const createApp = require("./helpers/createApp");
const Listing = require("../models/listing");
const User = require("../models/user");

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

async function registerAndLogin(username, email, password) {
  const sess = Session(app);
  await sess.post("/signup").type("form").send({ username, email, password });
  return sess;
}

async function createListing(userId) {
  const listing = new Listing({
    title: "Beach House",
    description: "Lovely beach house.",
    location: "Goa",
    country: "India",
    price: 5000,
    category: "Trending",
    image: { url: "http://example.com/beach.jpg", filename: "beach.jpg" },
    owner: userId,
  });
  await listing.save();
  return listing;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("POST /listings/:id/book", () => {
  it("creates a booking and renders the payment page for a valid date range", async () => {
    const sess = await registerAndLogin("booker1", "booker1@example.com", "pass1234");
    const user = await User.findOne({ username: "booker1" });
    const listing = await createListing(user._id);

    const checkIn = "2025-12-01";
    const checkOut = "2025-12-05"; // 4 nights — valid

    const res = await sess
      .post(`/listings/${listing._id}/book`)
      .type("form")
      .send({ checkIn, checkOut });

    // bookListing controller renders listings/payment — expect 200
    expect(res.status).toBe(200);
    // The rendered page should reference the razorpay order id
    expect(res.text).toContain("order_test_123");
  });

  it("rejects checkOut <= checkIn and redirects back to listing", async () => {
    const sess = await registerAndLogin("booker2", "booker2@example.com", "pass1234");
    const user = await User.findOne({ username: "booker2" });
    const listing = await createListing(user._id);

    // Same day → days === 0 → should reject
    const res = await sess
      .post(`/listings/${listing._id}/book`)
      .type("form")
      .send({ checkIn: "2025-12-05", checkOut: "2025-12-05" });

    expect(res.status).toBe(302);
    expect(res.headers.location).toMatch(new RegExp(`/listings/${listing._id}`));
  });

  it("rejects checkOut before checkIn and redirects back to listing", async () => {
    const sess = await registerAndLogin("booker3", "booker3@example.com", "pass1234");
    const user = await User.findOne({ username: "booker3" });
    const listing = await createListing(user._id);

    // Checkout before check-in → days < 0
    const res = await sess
      .post(`/listings/${listing._id}/book`)
      .type("form")
      .send({ checkIn: "2025-12-10", checkOut: "2025-12-05" });

    expect(res.status).toBe(302);
    expect(res.headers.location).toMatch(new RegExp(`/listings/${listing._id}`));
  });

  it("redirects unauthenticated users to /login", async () => {
    const owner = new User({ username: "listingOwner", email: "lo@example.com" });
    await User.register(owner, "ownerPass");
    const listing = await createListing(owner._id);

    const res = await Session(app)
      .post(`/listings/${listing._id}/book`)
      .type("form")
      .send({ checkIn: "2025-12-01", checkOut: "2025-12-05" });

    expect(res.status).toBe(302);
    expect(res.headers.location).toMatch(/\/login/);
  });
});
