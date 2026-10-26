import 'dotenv/config';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import mongoose from 'mongoose';
import { createApp } from '../app.js';
import { User } from '../models/User.js';
import { Session } from '../models/Session.js';
import { digestToken, SESSION_COOKIE } from '../auth/sessions.js';
import { verifyPassword } from '../auth/passwords.js';

const suffix = randomBytes(8).toString('hex');
const usernames = [`auth-${suffix}`, `peer-${suffix}`];
const emails = usernames.map((username) => `${username}@example.invalid`);
const password = `Temporary test ${randomBytes(16).toString('hex')}`;
let server;
let base;
let fixtureIds = [];

async function start() {
  server = createApp({ getDatabaseStatus: () => 'connected' }).listen(0, '127.0.0.1');
  await new Promise((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });
  base = `http://127.0.0.1:${server.address().port}`;
}
async function stop() {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
    server = undefined;
  }
}
async function request(path, { body, cookie, headers = {}, method } = {}) {
  const response = await fetch(`${base}/api/auth/${path}`, {
    method: method || (body === undefined ? 'GET' : 'POST'),
    headers: {
      'Content-Type': 'application/json',
      'X-Codefolio-Request': '1',
      ...(cookie ? { Cookie: cookie } : {}),
      ...headers,
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  return { response, body: response.status === 204 ? null : await response.json() };
}
function sessionCookie(response) {
  const header = response.headers.get('set-cookie');
  assert.ok(header?.includes('HttpOnly'));
  assert.ok(header.includes('SameSite=Lax'));
  assert.ok(!header.includes('Secure')); // This verification server is intentionally local HTTP.
  return header.split(';')[0];
}

try {
  assert.ok(process.env.MONGODB_URI, 'Configure the local database first.');
  await mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 10000,
    autoIndex: false,
  });
  await Promise.all([User.createIndexes(), Session.createIndexes()]);
  await start();

  let result = await request('me');
  assert.equal(result.response.status, 401);
  result = await request('register', {
    body: { name: '', email: 'invalid', username: 'dashboard', password: 'short' },
  });
  assert.equal(result.response.status, 400);
  console.log('PASS: Anonymous session access and invalid registration are rejected.');

  for (let index = 0; index < 2; index++) {
    result = await request('register', {
      body: {
        name: 'Temporary authentication verification',
        username: usernames[index],
        email: emails[index],
        password,
        tier: 'pro',
        templateId: 'cyberpunk',
        passwordHash: 'client-supplied-value',
      },
    });
    assert.equal(result.response.status, 400);
    result = await request('register', {
      body: {
        name: 'Temporary authentication verification',
        username: usernames[index],
        email: emails[index],
        password,
      },
    });
    assert.equal(result.response.status, 201);
    assert.equal(result.body.user.tier, 'free');
    assert.equal(result.body.user.templateId, 'bento');
    assert.equal(result.response.headers.get('set-cookie'), null);
    assert.equal(Object.hasOwn(result.body.user, 'passwordHash'), false);
  }
  fixtureIds = (await User.find({ username: { $in: usernames } })).map((user) => user._id);
  assert.equal(fixtureIds.length, 2);
  const stored = await User.findOne({ username: usernames[0] }).select('+passwordHash');
  assert.notEqual(stored.passwordHash, password);
  assert.ok(await verifyPassword(password, stored.passwordHash));
  console.log(
    'PASS: Registration saves real password hashes, rejects privileged fields and requires separate login.',
  );

  for (const body of [
    {
      name: 'Duplicate',
      username: usernames[0].toUpperCase(),
      email: `other-${suffix}@example.invalid`,
      password,
    },
    { name: 'Duplicate', username: `other-${suffix}`, email: emails[0].toUpperCase(), password },
  ]) {
    result = await request('register', { body });
    assert.equal(result.response.status, 409);
  }
  for (const email of [emails[0], `missing-${suffix}@example.invalid`]) {
    result = await request('login', { body: { email, password: 'Definitely incorrect password' } });
    assert.equal(result.response.status, 401);
    assert.equal(result.body.error.message, 'Email or password is incorrect.');
  }
  console.log('PASS: Duplicate registration and invalid credentials return safe errors.');

  result = await request('login', { body: { email: emails[0].toUpperCase(), password } });
  assert.equal(result.response.status, 200);
  let cookie = sessionCookie(result.response);
  const oldCookie = cookie;
  const token = cookie.slice(SESSION_COOKIE.length + 1);
  const session = await Session.findOne({ userId: stored._id }).select('+tokenHash');
  assert.equal(session.tokenHash, digestToken(token));
  assert.notEqual(session.tokenHash, token);
  assert.equal(Object.hasOwn(result.body, 'token'), false);
  result = await request('me', { cookie });
  assert.equal(result.response.status, 200);
  assert.equal(result.body.user.username, usernames[0]);
  assert.equal(Object.hasOwn(result.body.user, 'passwordHash'), false);

  result = await request('login', { cookie, body: { email: emails[0], password } });
  cookie = sessionCookie(result.response);
  assert.notEqual(cookie, oldCookie);
  assert.equal((await request('me', { cookie: oldCookie })).response.status, 401);
  console.log(
    'PASS: HTTP-only sessions use hashed tokens, authenticate the correct user and rotate on login.',
  );

  await stop();
  await start();
  assert.equal((await request('me', { cookie })).response.status, 200);
  const peer = await request('login', { body: { email: emails[1], password } });
  const peerCookie = sessionCookie(peer.response);
  assert.equal((await request('me', { cookie: peerCookie })).body.user.username, usernames[1]);
  assert.equal((await request('me', { cookie })).body.user.username, usernames[0]);
  console.log(
    'PASS: Sessions persist across server recreation and separate accounts resolve independently.',
  );

  result = await request('logout', {
    cookie,
    body: {},
    headers: { Origin: 'https://untrusted.example' },
  });
  assert.equal(result.response.status, 403);
  assert.equal((await request('me', { cookie })).response.status, 200);
  result = await request('logout', { cookie, body: {} });
  assert.equal(result.response.status, 204);
  assert.equal((await request('me', { cookie })).response.status, 401);
  assert.equal((await request('logout', { body: {} })).response.status, 204);
  console.log(
    'PASS: Cross-origin logout is rejected; valid logout revokes server-side sessions and is repeatable.',
  );

  await Session.updateOne(
    { tokenHash: digestToken(peerCookie.slice(SESSION_COOKIE.length + 1)) },
    { expiresAt: new Date(Date.now() - 1000) },
  );
  assert.equal((await request('me', { cookie: peerCookie })).response.status, 401);
  assert.equal(
    (await request('me', { cookie: `${SESSION_COOKIE}=malformed` })).response.status,
    401,
  );
  console.log('PASS: Expired and malformed session cookies are rejected immediately.');
} catch (error) {
  const safeName = [
    'AssertionError',
    'ValidationError',
    'MongoServerError',
    'MongooseServerSelectionError',
  ].includes(error.name)
    ? error.name
    : 'VerificationError';
  console.error(
    `FAIL: Authentication verification did not finish (${safeName}). No credentials displayed.`,
  );
  process.exitCode = 1;
} finally {
  await stop();
  if (mongoose.connection.readyState === 1) {
    try {
      // Exact per-run identities only; never clear collections or unrelated accounts.
      fixtureIds = (await User.find({ username: { $in: usernames }, email: { $in: emails } })).map(
        (user) => user._id,
      );
      await Session.deleteMany({ userId: { $in: fixtureIds } });
      await User.deleteMany({ _id: { $in: fixtureIds } });
      assert.equal(await User.countDocuments({ _id: { $in: fixtureIds } }), 0);
      assert.equal(await Session.countDocuments({ userId: { $in: fixtureIds } }), 0);
      console.log('PASS: Temporary authentication accounts and sessions removed.');
    } catch {
      console.error('FAIL: Temporary fixture cleanup requires attention.');
      process.exitCode = 1;
    }
  }
  await mongoose.disconnect();
}
