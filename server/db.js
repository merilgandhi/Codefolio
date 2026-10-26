import mongoose from 'mongoose';

const states = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' };
let configured = false;

export function databaseStatus() {
  return configured ? states[mongoose.connection.readyState] || 'disconnected' : 'not_configured';
}

export async function connectDatabase(uri) {
  configured = Boolean(uri);
  if (!configured) {
    console.info('MongoDB is not configured. Add MONGODB_URI to .env to enable persistence.');
    return;
  }
  mongoose.connection.on('error', () =>
    console.error('MongoDB connection error. Check your database settings.'),
  );
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
  console.info('MongoDB connected.');
}

export async function disconnectDatabase() {
  await mongoose.disconnect();
}
