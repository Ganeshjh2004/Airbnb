/**
 * tests/auth.test.js
 *
 * Tests for user registration and login via passport-local.
 *
 * Strategy: Use supertest-session to preserve the session cookie across
 * requests within a single test, simulating a real browser session.
 */

const request = require("supertest");
const Session = require("supertest-session");
const db = require("./helpers/db");
const createApp = require("./helpers/createApp");

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

// ── Signup ────────────────────────────────────────────────────────────────────

describe("POST /signup", () => {
  it("creates a new user and redirects to /listings", async () => {
    const res = await request(app)
      .post("/signup")
      .type("form")
      .send({ username: "alice", email: "alice@example.com", password: "pass1234" });

    expect(res.status).toBe(302);
    expect(res.headers.location).toMatch(/\/listings/);
  });

  it("redirects back to /signup on duplicate username", async () => {
    // Register alice once
    await request(app)
      .post("/signup")
      .type("form")
      .send({ username: "alice", email: "alice@example.com", password: "pass1234" });

    // Try to register alice again
    const res = await request(app)
      .post("/signup")
      .type("form")
      .send({ username: "alice", email: "alice2@example.com", password: "pass1234" });

    expect(res.status).toBe(302);
    expect(res.headers.location).toMatch(/\/signup/);
  });
});

// ── Login ─────────────────────────────────────────────────────────────────────

describe("POST /login", () => {
  /**
   * Register a user before each login test so the user exists in the DB.
   */
  beforeEach(async () => {
    await request(app)
      .post("/signup")
      .type("form")
      .send({ username: "bob", email: "bob@example.com", password: "securePass99" });
  });

  it("logs in with valid credentials and redirects to /listings", async () => {
    const res = await request(app)
      .post("/login")
      .type("form")
      .send({ username: "bob", password: "securePass99" });

    expect(res.status).toBe(302);
    expect(res.headers.location).toMatch(/\/listings/);
  });

  it("redirects to /login on wrong password", async () => {
    const res = await request(app)
      .post("/login")
      .type("form")
      .send({ username: "bob", password: "wrongPassword" });

    expect(res.status).toBe(302);
    expect(res.headers.location).toMatch(/\/login/);
  });

  it("redirects to /login on non-existent user", async () => {
    const res = await request(app)
      .post("/login")
      .type("form")
      .send({ username: "nobody", password: "pass1234" });

    expect(res.status).toBe(302);
    expect(res.headers.location).toMatch(/\/login/);
  });

  it("persists session after login (subsequent request is authenticated)", async () => {
    const sess = Session(app);

    // Login
    await sess
      .post("/login")
      .type("form")
      .send({ username: "bob", password: "securePass99" });

    // A subsequent request with the same session should be authenticated.
    // GET /listings renders an EJS template; we just check it doesn't redirect to /login.
    const res = await sess.get("/listings");
    expect(res.status).toBe(200);
  });
});
