const env = require('./config/env');
const { connectDB, disconnectDB } = require('./config/db');
const createApp = require('./app');
const { seedIfEmpty } = require('./data/seed');

async function start() {
  const db = await connectDB();
  console.log(`✓ MongoDB connected (${db.mode}) → ${db.host}/${db.name}`);
  if (db.mode === 'in-memory') {
    console.log('  Using a temporary in-memory database. Set MONGODB_URI in backend/.env to keep your data.');
  }

  if (env.autoSeed) {
    const seeded = await seedIfEmpty();
    if (seeded) console.log(`✓ Seeded demo data: ${seeded.plans} plans, ${seeded.customers} customers, ${seeded.activities} events`);
  }

  const app = createApp();
  const server = app.listen(env.port, () => {
    console.log(`✓ SaaSPulse API listening on http://localhost:${env.port}/api`);
  });

  const shutdown = async (signal) => {
    console.log(`\n${signal} received, shutting down…`);
    server.close();
    await disconnectDB();
    process.exit(0);
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

start().catch((err) => {
  console.error('✗ Failed to start server:', err.message);
  process.exit(1);
});
