import { createApp } from './app.js';
import { config } from './config.js';
import { connectDatabase, disconnectDatabase } from './db.js';
import { User } from './models/User.js';
import { Session } from './models/Session.js';

try {
  await connectDatabase(config.mongodbUri);
  if (config.mongodbUri) await Promise.all([User.init(), Session.init()]);
  const server = createApp({
    production: config.production,
    origins: config.origins,
    trustProxy: config.trustProxy,
  }).listen(config.port, '127.0.0.1', () => {
    console.info(`CodeFolio API: http://127.0.0.1:${config.port}`);
  });
  server.on('error', () => {
    console.error('Could not start the API. Check whether PORT is already in use.');
    process.exitCode = 1;
    void disconnectDatabase();
  });
  const shutdown = () => {
    server.close(() => void disconnectDatabase());
  };
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
} catch {
  console.error('Startup failed. Check MONGODB_URI, database availability, and network access.');
  await disconnectDatabase();
  process.exitCode = 1;
}
