/**
 * npm run seed — wipes the database and loads fresh demo data.
 * Requires MONGODB_URI (an in-memory database would vanish as soon as this script exits).
 */
const env = require('../config/env');
const { connectDB, disconnectDB } = require('../config/db');
const { seedDatabase } = require('../data/seed');

(async () => {
  if (!env.mongoUri) {
    console.error('Set MONGODB_URI in backend/.env first. Without it the server seeds an in-memory database automatically on start.');
    process.exit(1);
  }
  try {
    const db = await connectDB();
    console.log(`Connected to ${db.host}/${db.name}. Replacing all data…`);
    const r = await seedDatabase();
    console.log(`✓ Seeded ${r.plans} plans, ${r.customers} customers, ${r.activities} revenue events.`);
  } catch (err) {
    console.error('✗ Seeding failed:', err.message);
    process.exitCode = 1;
  } finally {
    await disconnectDB();
  }
})();
