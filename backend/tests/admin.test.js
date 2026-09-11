/**
 * tests/admin.test.js
 *
 * Comprehensive tests for the Admin authentication, dashboard, and authorization bypass:
 * 1. Admin login form rendering (GET /admin/login)
 * 2. Admin authentication via "admin-local" strategy (POST /admin/login)
 * 3. Strategy isolation between User and Admin models
 * 4. Admin logout (POST /admin/logout)
 * 5. isAdminLoggedIn middleware enforcement (403 + redirect)
 * 6. Admin dashboard analytics rendering (GET /admin/dashboard)
 * 7. isOwner admin bypass: Admins can edit/delete any listing; regular users cannot
 */

const request = require("supertest");
const Session = require("supertest-session");
const db = require("./helpers/db");
const createApp = require("./helpers/createApp");
const Admin = require("../models/Admin");
const User = require("../models/user");
const Listing = require("../models/listing");
const { isAdminLoggedIn } = require("../middleware");

let app;

beforeAll(async () => {
  await db.connect();
  app = createApp();

  // Attach a test route protected by isAdminLoggedIn
  app.get("/admin/test-protected", isAdminLoggedIn, (req, res) => {
    res.status(200).send("ADMIN_PROTECTED_DATA");
  });
});

afterEach(async () => {
  await db.clearDatabase();
});

afterAll(async () => {
  await db.closeDatabase();
});

describe("GET /admin/login", () => {
  it("renders the admin login page", async () => {
    const res = await request(app).get("/admin/login");
    expect(res.status).toBe(200);
    expect(res.text).toContain("Admin Portal");
    expect(res.text).toContain("/admin/login");
  });
});

describe("Admin Authentication (admin-local strategy)", () => {
  beforeEach(async () => {
    // Seed an in-memory test admin
    const testAdmin = new Admin({ username: "superadmin" });
    await Admin.register(testAdmin, "AdminPass123!");
  });

  it("successfully logs in with valid admin credentials", async () => {
    const res = await request(app)
      .post("/admin/login")
      .type("form")
      .send({ username: "superadmin", password: "AdminPass123!" });

    expect(res.status).toBe(302);
    expect(res.headers.location).toMatch(/\/admin\/dashboard/);
  });

  it("fails login with invalid admin password and redirects to /admin/login", async () => {
    const res = await request(app)
      .post("/admin/login")
      .type("form")
      .send({ username: "superadmin", password: "wrongPassword" });

    expect(res.status).toBe(302);
    expect(res.headers.location).toMatch(/\/admin\/login/);
  });

  it("fails login for non-existent admin", async () => {
    const res = await request(app)
      .post("/admin/login")
      .type("form")
      .send({ username: "ghostAdmin", password: "somePassword" });

    expect(res.status).toBe(302);
    expect(res.headers.location).toMatch(/\/admin\/login/);
  });

  it("logs out admin via POST /admin/logout", async () => {
    const sess = Session(app);

    // Login admin
    await sess
      .post("/admin/login")
      .type("form")
      .send({ username: "superadmin", password: "AdminPass123!" });

    // Logout admin
    const res = await sess.post("/admin/logout");
    expect(res.status).toBe(302);
    expect(res.headers.location).toMatch(/\/admin\/login/);

    // Subsequent access to protected route should now be rejected
    const protectedRes = await sess.get("/admin/test-protected");
    expect(protectedRes.status).toBe(403);
    expect(protectedRes.headers.location).toMatch(/\/admin\/login/);
  });
});

describe("Strategy Isolation (User vs Admin)", () => {
  beforeEach(async () => {
    // Register regular user in users collection
    await request(app)
      .post("/signup")
      .type("form")
      .send({ username: "regularUser", email: "user@example.com", password: "UserPass123!" });

    // Register admin in admins collection
    const testAdmin = new Admin({ username: "siteAdmin" });
    await Admin.register(testAdmin, "AdminPass123!");
  });

  it("prevents regular user from authenticating via /admin/login", async () => {
    const res = await request(app)
      .post("/admin/login")
      .type("form")
      .send({ username: "regularUser", password: "UserPass123!" });

    // Should fail admin-local strategy and redirect back to /admin/login
    expect(res.status).toBe(302);
    expect(res.headers.location).toMatch(/\/admin\/login/);
  });

  it("prevents admin from authenticating via regular /login", async () => {
    const res = await request(app)
      .post("/login")
      .type("form")
      .send({ username: "siteAdmin", password: "AdminPass123!" });

    // Should fail local strategy and redirect back to /login
    expect(res.status).toBe(302);
    expect(res.headers.location).toMatch(/\/login/);
  });
});

describe("isAdminLoggedIn Middleware", () => {
  beforeEach(async () => {
    // Seed regular user
    await request(app)
      .post("/signup")
      .type("form")
      .send({ username: "johnDoe", email: "john@example.com", password: "johnPassword" });

    // Seed admin
    const admin = new Admin({ username: "rootAdmin" });
    await Admin.register(admin, "rootPass123!");
  });

  it("rejects unauthenticated requests with 403 and redirects to /admin/login", async () => {
    const res = await request(app).get("/admin/test-protected");
    expect(res.status).toBe(403);
    expect(res.headers.location).toMatch(/\/admin\/login/);
  });

  it("rejects authenticated regular users with 403 and redirects to /admin/login", async () => {
    const sess = Session(app);

    // Login as regular user
    await sess
      .post("/login")
      .type("form")
      .send({ username: "johnDoe", password: "johnPassword" });

    // Try accessing admin-protected route
    const res = await sess.get("/admin/test-protected");
    expect(res.status).toBe(403);
    expect(res.headers.location).toMatch(/\/admin\/login/);
  });

  it("allows authenticated admin through to protected route", async () => {
    const sess = Session(app);

    // Login as admin
    await sess
      .post("/admin/login")
      .type("form")
      .send({ username: "rootAdmin", password: "rootPass123!" });

    // Access admin-protected route
    const res = await sess.get("/admin/test-protected");
    expect(res.status).toBe(200);
    expect(res.text).toBe("ADMIN_PROTECTED_DATA");
  });
});

describe("Admin Dashboard (GET /admin/dashboard)", () => {
  let alice, bob;

  beforeEach(async () => {
    // Seed users
    const u1 = new User({ username: "alice", email: "alice@test.com" });
    alice = await User.register(u1, "pass1234");
    const u2 = new User({ username: "bob", email: "bob@test.com" });
    bob = await User.register(u2, "pass1234");

    // Seed listings: 2 for alice, 1 for bob
    await Listing.create({
      title: "Alice Villa",
      description: "Nice villa",
      price: 1500,
      location: "Goa",
      country: "India",
      category: "Trending",
      owner: alice._id,
    });
    await Listing.create({
      title: "Alice Cottage",
      description: "Cozy cottage",
      price: 2000,
      location: "Manali",
      country: "India",
      category: "Mountains",
      owner: alice._id,
    });
    await Listing.create({
      title: "Bob Studio",
      description: "Cozy studio",
      price: 1000,
      location: "Mumbai",
      country: "India",
      category: "Rooms",
      owner: bob._id,
    });

    // Seed admin
    const admin = new Admin({ username: "dashAdmin" });
    await Admin.register(admin, "adminSecret123!");
  });

  it("rejects unauthenticated requests with 403 redirect to /admin/login", async () => {
    const res = await request(app).get("/admin/dashboard");
    expect(res.status).toBe(403);
    expect(res.headers.location).toMatch(/\/admin\/login/);
  });

  it("rejects regular users with 403 redirect to /admin/login", async () => {
    const sess = Session(app);
    await sess
      .post("/login")
      .type("form")
      .send({ username: "alice", password: "pass1234" });

    const res = await sess.get("/admin/dashboard");
    expect(res.status).toBe(403);
    expect(res.headers.location).toMatch(/\/admin\/login/);
  });

  it("renders dashboard with total counts, user breakdown, and listings for admin", async () => {
    const sess = Session(app);
    await sess
      .post("/admin/login")
      .type("form")
      .send({ username: "dashAdmin", password: "adminSecret123!" });

    const res = await sess.get("/admin/dashboard");
    expect(res.status).toBe(200);
    expect(res.text).toContain("Admin Dashboard");
    expect(res.text).toContain("Total Listings:");
    expect(res.text).toContain("Total Users:");
    expect(res.text).toContain("Alice Villa");
    expect(res.text).toContain("Bob Studio");
    expect(res.text).toContain("alice");
    expect(res.text).toContain("bob");
  });
});

describe("isOwner Middleware: Admin CRUD Bypass vs Regular User Protection", () => {
  let alice, bob, aliceListing;

  beforeEach(async () => {
    // Seed users
    const u1 = new User({ username: "aliceUser", email: "alice2@test.com" });
    alice = await User.register(u1, "pass1234");
    const u2 = new User({ username: "bobUser", email: "bob2@test.com" });
    bob = await User.register(u2, "pass1234");

    // Listing owned by alice
    aliceListing = await Listing.create({
      title: "Alice Luxury Penthouse",
      description: "Amazing view",
      price: 5000,
      location: "Bangalore",
      country: "India",
      category: "Iconic Cities",
      owner: alice._id,
    });

    // Seed admin
    const admin = new Admin({ username: "crudAdmin" });
    await Admin.register(admin, "crudAdminPass!");
  });

  it("STRICT REGRESSION GUARD: regular user Bob CANNOT edit Alice's listing", async () => {
    const sess = Session(app);
    await sess
      .post("/login")
      .type("form")
      .send({ username: "bobUser", password: "pass1234" });

    // Try accessing edit page
    const res = await sess.get(`/listings/${aliceListing._id}/edit`);
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe(`/listings/${aliceListing._id}`);
  });

  it("STRICT REGRESSION GUARD: regular user Bob CANNOT delete Alice's listing", async () => {
    const sess = Session(app);
    await sess
      .post("/login")
      .type("form")
      .send({ username: "bobUser", password: "pass1234" });

    // Try deleting Alice's listing
    const res = await sess.delete(`/listings/${aliceListing._id}`);
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe(`/listings/${aliceListing._id}`);

    // Verify document was NOT deleted
    const stillExists = await Listing.findById(aliceListing._id);
    expect(stillExists).not.toBeNull();
  });

  it("Admin CAN access edit page for Alice's listing", async () => {
    const sess = Session(app);
    await sess
      .post("/admin/login")
      .type("form")
      .send({ username: "crudAdmin", password: "crudAdminPass!" });

    const res = await sess.get(`/listings/${aliceListing._id}/edit`);
    expect(res.status).toBe(200);
    expect(res.text).toContain("Edit your Listing");
  });

  it("Admin CAN update Alice's listing", async () => {
    const sess = Session(app);
    await sess
      .post("/admin/login")
      .type("form")
      .send({ username: "crudAdmin", password: "crudAdminPass!" });

    const res = await sess
      .put(`/listings/${aliceListing._id}`)
      .type("form")
      .send({
        listing: {
          title: "Alice Luxury Penthouse (Updated by Admin)",
          description: "Updated description",
          price: 7500,
          location: "Bangalore",
          country: "India",
          category: "Iconic Cities",
        },
      });

    expect(res.status).toBe(302);
    const updated = await Listing.findById(aliceListing._id);
    expect(updated.title).toBe("Alice Luxury Penthouse (Updated by Admin)");
    expect(updated.price).toBe(7500);
  });

  it("Admin CAN delete Alice's listing", async () => {
    const sess = Session(app);
    await sess
      .post("/admin/login")
      .type("form")
      .send({ username: "crudAdmin", password: "crudAdminPass!" });

    const res = await sess.delete(`/listings/${aliceListing._id}`);
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe("/listings");

    // Verify document was deleted
    const deleted = await Listing.findById(aliceListing._id);
    expect(deleted).toBeNull();
  });
});
