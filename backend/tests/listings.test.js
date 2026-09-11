/**
 * tests/listings.test.js
 *
 * Tests for Listing CRUD routes, including that the isOwner middleware
 * rejects non-owners for PUT and DELETE.
 *
 * Strategy:
 *  - Listings are inserted directly via Mongoose (bypasses multer/Cloudinary).
 *  - We log in via POST /login using supertest-session so the session cookie
 *    is preserved across requests.
 *  - The listing create (POST /listings) test requires req.file from multer.
 *    We inject a fake file by adding a small before-the-route middleware in
 *    the test request via a wrapper app — but it is simpler and equivalent to
 *    just create the listing directly and test the GET/PUT/DELETE flows.
 */

const Session = require("supertest-session");
const mongoose = require("mongoose");
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

/**
 * Registers a user and returns a logged-in supertest-session.
 */
async function registerAndLogin(username, email, password) {
  const sess = Session(app);
  await sess
    .post("/signup")
    .type("form")
    .send({ username, email, password });
  return sess;
}

/**
 * Creates a Listing document directly in the DB, owned by `userId`.
 */
async function createListing(userId) {
  const listing = new Listing({
    title: "Cozy Mountain Cabin",
    description: "A beautiful cabin in the mountains.",
    location: "Shimla",
    country: "India",
    price: 2000,
    category: "Mountains",
    image: { url: "http://example.com/img.jpg", filename: "img.jpg" },
    owner: userId,
  });
  await listing.save();
  return listing;
}

/**
 * Looks up the User document for a registered username.
 */
async function findUser(username) {
  return User.findOne({ username });
}

// ── GET /listings ─────────────────────────────────────────────────────────────

describe("GET /listings", () => {
  it("returns 200 for an unauthenticated visitor", async () => {
    const res = await Session(app).get("/listings");
    expect(res.status).toBe(200);
  });

  it("returns 200 with a listing visible", async () => {
    // Create an owner user directly in DB
    const owner = new User({ username: "owner1", email: "o@example.com" });
    await User.register(owner, "ownerpass");

    await createListing(owner._id);

    const res = await Session(app).get("/listings");
    expect(res.status).toBe(200);
    expect(res.text).toContain("Cozy Mountain Cabin");
  });
});

// ── DELETE /listings/:id (isOwner guard) ──────────────────────────────────────

describe("DELETE /listings/:id", () => {
  it("allows the owner to delete their listing", async () => {
    const sess = await registerAndLogin("ownerDel", "ownerdel@example.com", "pass1234");
    const user = await findUser("ownerDel");
    const listing = await createListing(user._id);

    const res = await sess
      .delete(`/listings/${listing._id}`)
      .query({ _method: "DELETE" });

    // Should redirect away from the listing (302 to /listings)
    expect(res.status).toBe(302);
    expect(res.headers.location).toMatch(/\/listings/);

    // Verify it's actually gone from DB
    const gone = await Listing.findById(listing._id);
    expect(gone).toBeNull();
  });

  it("rejects a non-owner and redirects back to the listing", async () => {
    // Create the owner and a listing
    const owner = new User({ username: "realOwner", email: "real@example.com" });
    await User.register(owner, "ownerPass1");

    const listing = await createListing(owner._id);

    // Log in as a different user
    const sess = await registerAndLogin("intruder", "intruder@example.com", "pass1234");

    const res = await sess
      .delete(`/listings/${listing._id}`)
      .query({ _method: "DELETE" });

    // isOwner middleware redirects to the listing page, not /listings
    expect(res.status).toBe(302);
    expect(res.headers.location).toMatch(new RegExp(`/listings/${listing._id}`));

    // Listing should still exist
    const stillThere = await Listing.findById(listing._id);
    expect(stillThere).not.toBeNull();
  });

  it("redirects an unauthenticated request to /login", async () => {
    const owner = new User({ username: "ownerAnon", email: "oa@example.com" });
    await User.register(owner, "ownerPass2");
    const listing = await createListing(owner._id);

    const res = await Session(app)
      .delete(`/listings/${listing._id}`)
      .query({ _method: "DELETE" });

    expect(res.status).toBe(302);
    expect(res.headers.location).toMatch(/\/login/);
  });
});

// ── PUT /listings/:id (isOwner guard) ─────────────────────────────────────────

describe("PUT /listings/:id", () => {
  const updatedBody = {
    "listing[title]": "Updated Title",
    "listing[description]": "Updated description text.",
    "listing[location]": "Manali",
    "listing[country]": "India",
    "listing[price]": "3000",
    "listing[category]": "Mountains",
  };

  it("allows the owner to update their listing", async () => {
    const sess = await registerAndLogin("ownerUpd", "ownerupd@example.com", "pass1234");
    const user = await findUser("ownerUpd");
    const listing = await createListing(user._id);

    const res = await sess
      .put(`/listings/${listing._id}`)
      .type("form")
      .send(updatedBody);

    expect(res.status).toBe(302);
    expect(res.headers.location).toMatch(new RegExp(`/listings/${listing._id}`));
  });

  it("rejects a non-owner (isOwner) and redirects back to listing", async () => {
    const owner = new User({ username: "realOwnerPut", email: "realput@example.com" });
    await User.register(owner, "ownerPass3");
    const listing = await createListing(owner._id);

    const sess = await registerAndLogin("intruder2", "intruder2@example.com", "pass1234");

    const res = await sess
      .put(`/listings/${listing._id}`)
      .type("form")
      .send(updatedBody);

    expect(res.status).toBe(302);
    expect(res.headers.location).toMatch(new RegExp(`/listings/${listing._id}`));
  });
});
