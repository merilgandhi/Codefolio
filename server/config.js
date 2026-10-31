import 'dotenv/config';

const port = Number(process.env.PORT || 4000);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('PORT must be an integer between 1 and 65535.');
}

const production = process.env.NODE_ENV === 'production';
const host = process.env.HOST?.trim() || (production ? '0.0.0.0' : '127.0.0.1');

export const config = {
  host,
  port,
  mongodbUri: process.env.MONGODB_URI?.trim() || '',
  production,
  origins: process.env.APP_ORIGIN
    ? [new URL(process.env.APP_ORIGIN).origin]
    : ['http://127.0.0.1:5174', 'http://localhost:5174'],
  trustProxy: process.env.TRUST_PROXY === '1' ? 1 : false,
};

if (config.production && (!process.env.APP_ORIGIN || !config.origins[0].startsWith('https://'))) {
  throw new Error('Production requires an HTTPS APP_ORIGIN.');
}
