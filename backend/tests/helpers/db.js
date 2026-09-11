/**
 * tests/helpers/db.js
 *
 * Manages the lifecycle of the MongoMemoryServer for the test suite.
 * Import `connect`, `closeDatabase`, and `clearDatabase` in your test files.
 *
 * Usage in a test file:
 *   const db = require('./helpers/db');
 *   beforeAll(db.connect);
 *   afterEach(db.clearDatabase);
 *   afterAll(db.closeDatabase);
 */

const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");

let mongoServer;

/**
 * Starts an in-memory MongoDB server and connects Mongoose to it.
 * Call this in `beforeAll`.
 */
async function connect() {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
}

/**
 * Drops all collections in the in-memory database.
 * Call this in `afterEach` to keep tests isolated.
 */
async function clearDatabase() {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
}

/**
 * Disconnects Mongoose and stops the in-memory server.
 * Call this in `afterAll`.
 */
async function closeDatabase() {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
  await mongoServer.stop();
}

module.exports = { connect, clearDatabase, closeDatabase };
