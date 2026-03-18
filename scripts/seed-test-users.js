/**
 * Seed script: creates test admin and agent users for Playwright E2E tests.
 * Run: node scripts/seed-test-users.js
 */
require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../models/User");

const TEST_USERS = [
  {
    username: "testadmin",
    email: process.env.TEST_ADMIN_EMAIL || "admin@riskmarshal.com",
    password: process.env.TEST_ADMIN_PASSWORD || "admin123",
    role: "admin",
    firstName: "Test",
    lastName: "Admin",
    isActive: true,
  },
  {
    username: "testagent",
    email: process.env.TEST_AGENT_EMAIL || "agent@riskmarshal.com",
    password: process.env.TEST_AGENT_PASSWORD || "agent123",
    role: "agent",
    firstName: "Test",
    lastName: "Agent",
    isActive: true,
  },
];

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected to MongoDB");

  for (const u of TEST_USERS) {
    const hashed = await bcrypt.hash(u.password, 10);
    await User.findOneAndUpdate(
      { email: u.email },
      { ...u, password: hashed },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    console.log(`Upserted ${u.role}: ${u.email}`);
  }

  console.log("Seed complete.");
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
