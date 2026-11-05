const mongoose = require('mongoose');
const env = require('./env');

let memoryServer = null;

/**
 * Connects to MongoDB.
 * - If MONGODB_URI is set, connects to it (local MongoDB or Atlas).
 * - Otherwise, in development, starts a throwaway in-memory MongoDB so the
 *   project runs with zero setup. Data is lost when the server stops.
 */
async function connectDB(uriOverride) {
  let uri = uriOverride || env.mongoUri;
  let mode = 'external';

  if (!uri) {
    if (env.isProd) {
      throw new Error('MONGODB_URI is required in production.');
    }
    let MongoMemoryServer;
    try {
      ({ MongoMemoryServer } = require('mongodb-memory-server'));
    } catch {
      throw new Error(
        'MONGODB_URI is not set and mongodb-memory-server is not installed. ' +
          'Set MONGODB_URI in backend/.env (see .env.example).'
      );
    }
    memoryServer = await MongoMemoryServer.create();
    uri = memoryServer.getUri('saaspulse');
    mode = 'in-memory';
  }

  mongoose.set('strictQuery', true);
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 });
  return { mode, host: mongoose.connection.host, name: mongoose.connection.name };
}

async function disconnectDB() {
  await mongoose.disconnect();
  if (memoryServer) {
    await memoryServer.stop();
    memoryServer = null;
  }
}

function dbStatus() {
  const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  return {
    state: states[mongoose.connection.readyState] || 'unknown',
    inMemory: Boolean(memoryServer),
    name: mongoose.connection.name,
  };
}

module.exports = { connectDB, disconnectDB, dbStatus };
