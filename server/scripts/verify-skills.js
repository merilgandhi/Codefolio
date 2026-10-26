import 'dotenv/config';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import mongoose from 'mongoose';
import { createApp } from '../app.js';
import { User } from '../models/User.js';
import { Session } from '../models/Session.js';
import { hashPassword } from '../auth/passwords.js';
import { digestToken, SESSION_COOKIE } from '../auth/sessions.js';

const ids = [new mongoose.Types.ObjectId(), new mongoose.Types.ObjectId()];
const suffix = randomBytes(6).toString('hex');
const emails = ids.map((_, i) => `skills-${i}-${suffix}@example.invalid`);
const password = `Temporary skills check ${randomBytes(8).toString('hex')}`;
const empty = () => ({ frontend: [], backend: [], devops: [] });
let server;
let base;
async function start() {
  server = createApp({ getDatabaseStatus: () => 'connected' }).listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
}
async function stop() {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
    server = null;
  }
}
async function request(cookie, { path = '/api/skills', method = 'GET', body, headers = {} } = {}) {
  const response = await fetch(base + path, {
    method,
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
async function login(index) {
  const result = await request(null, {
    path: '/api/auth/login',
    method: 'POST',
    body: { email: emails[index], password },
  });
  assert.equal(result.response.status, 200);
  return result.response.headers.get('set-cookie').split(';')[0];
}

try {
  assert.ok(process.env.MONGODB_URI);
  await mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 10000,
    autoIndex: false,
  });
  await Promise.all([User.createIndexes(), Session.createIndexes()]);
  const passwordHash = await hashPassword(password);
  for (let i = 0; i < 2; i++)
    await User.create({
      _id: ids[i],
      username: `skills-${i}-${suffix}`,
      email: emails[i],
      passwordHash,
      profile: { name: `Skills owner ${i}`, bio: 'Keep my profile.' },
      tier: 'pro',
      templateId: 'cyberpunk',
      projects: [{ title: 'Keep my project', description: 'Project data must not change.' }],
      skills: { frontend: ['HTML'], backend: ['Node.js'], devops: ['Git'] },
    });
  await start();
  let cookie = await login(0);
  const peerCookie = await login(1);
  const initial = (await request(cookie)).body;
  const peer = (await request(peerCookie)).body;
  const protectedBefore = await User.findById(ids[0]).select('+email +passwordHash').lean();
  assert.deepEqual(Object.keys(initial).sort(), ['skills', 'version']);
  assert.equal((await request(null)).response.status, 401);
  assert.equal(
    (await request(null, { method: 'PUT', body: { skills: empty(), version: 0 } })).response.status,
    401,
  );
  console.log(
    'PASS: Skills reads and writes require a session and expose only categorized skills and version.',
  );

  const input = {
    frontend: [' React ', ' TypeScript '],
    backend: [' Express ', ' MongoDB '],
    devops: [' Docker ', ' GitHub Actions '],
  };
  let result = await request(cookie, {
    method: 'PUT',
    body: { skills: input, version: initial.version },
  });
  assert.equal(result.response.status, 200);
  assert.deepEqual(result.body.skills, {
    frontend: ['React', 'TypeScript'],
    backend: ['Express', 'MongoDB'],
    devops: ['Docker', 'GitHub Actions'],
  });
  assert.ok(result.body.version > initial.version);
  let saved = result.body;
  assert.deepEqual((await request(cookie)).body, saved);
  const protectedAfter = await User.findById(ids[0]).select('+email +passwordHash').lean();
  for (const key of ['profile', 'projects', 'email', 'passwordHash', 'tier', 'templateId'])
    assert.deepEqual(protectedAfter[key], protectedBefore[key]);
  console.log(
    'PASS: All three categories normalize, save and reload in Atlas without changing profile, projects or account fields.',
  );

  assert.equal(
    (await request(cookie, { method: 'PUT', body: { skills: empty(), version: initial.version } }))
      .response.status,
    409,
  );
  for (const extra of [
    { userId: String(ids[1]) },
    { username: `skills-1-${suffix}` },
    { tier: 'free' },
    { email: emails[1] },
    { $set: { profile: { name: 'Injected' } } },
  ]) {
    assert.equal(
      (
        await request(cookie, {
          method: 'PUT',
          body: { skills: empty(), version: saved.version, ...extra },
        })
      ).response.status,
      400,
    );
  }
  assert.equal(
    (await request(cookie, { path: `/api/skills?userId=${ids[1]}` })).response.status,
    400,
  );
  assert.equal(
    (
      await request(cookie, {
        method: 'PUT',
        path: `/api/skills/${ids[1]}`,
        body: { skills: empty(), version: saved.version },
      })
    ).response.status,
    404,
  );
  assert.deepEqual((await request(peerCookie)).body, peer);
  console.log(
    'PASS: Stale saves, account selectors and privilege injection are rejected; the peer account remains unchanged.',
  );

  for (const skills of [
    null,
    {},
    { ...empty(), frontend: 'React' },
    { ...empty(), frontend: ['React', 'react'] },
    { ...empty(), backend: [''] },
    { ...empty(), devops: [{}] },
    { ...empty(), frontend: ['x'.repeat(51)] },
    { ...empty(), devops: Array.from({ length: 41 }, (_, i) => `tool-${i}`) },
    { ...empty(), role: 'admin' },
  ]) {
    assert.equal(
      (await request(cookie, { method: 'PUT', body: { skills, version: saved.version } })).response
        .status,
      400,
    );
  }
  assert.equal(
    (
      await request(cookie, {
        method: 'PUT',
        headers: { Origin: 'https://untrusted.example' },
        body: { skills: empty(), version: saved.version },
      })
    ).response.status,
    403,
  );
  assert.deepEqual((await request(cookie)).body, saved);
  console.log(
    'PASS: Invalid types, blank/duplicate skills, oversized lists and cross-origin writes cannot change saved data.',
  );

  const raced = await Promise.all(
    ['Vue', 'Svelte'].map((skill) =>
      request(cookie, {
        method: 'PUT',
        body: { skills: { ...empty(), frontend: [skill] }, version: saved.version },
      }),
    ),
  );
  assert.deepEqual(raced.map((item) => item.response.status).sort(), [200, 409]);
  saved = (await request(cookie)).body;
  // A write in another section shares the User version and must invalidate stale skills.
  const profile = (await request(cookie, { path: '/api/profile' })).body;
  assert.equal(
    (await request(cookie, { method: 'PUT', path: '/api/profile', body: profile })).response.status,
    200,
  );
  assert.equal(
    (await request(cookie, { method: 'PUT', body: { skills: input, version: saved.version } }))
      .response.status,
    409,
  );
  saved = (await request(cookie)).body;
  await request(cookie, { path: '/api/auth/logout', method: 'POST', body: {} });
  cookie = await login(0);
  await stop();
  await start();
  assert.deepEqual((await request(cookie)).body, saved);
  console.log(
    'PASS: Racing and cross-section edits cannot overwrite each other; data survives logout/login and server recreation.',
  );

  const maximum = Object.fromEntries(
    ['frontend', 'backend', 'devops'].map((category) => [
      category,
      Array.from({ length: 40 }, (_, i) => `${i}`.padEnd(50, 'x')),
    ]),
  );
  result = await request(cookie, {
    method: 'PUT',
    body: { skills: maximum, version: saved.version },
  });
  assert.equal(result.response.status, 200);
  assert.deepEqual(result.body.skills, maximum);
  result = await request(cookie, {
    method: 'PUT',
    body: { skills: empty(), version: result.body.version },
  });
  assert.equal(result.response.status, 200);
  assert.deepEqual((await request(cookie)).body.skills, empty());
  await Session.updateOne(
    { tokenHash: digestToken(cookie.slice(SESSION_COOKIE.length + 1)) },
    { expiresAt: new Date(Date.now() - 1000) },
  );
  assert.equal(
    (
      await request(cookie, {
        method: 'PUT',
        body: { skills: input, version: result.body.version },
      })
    ).response.status,
    401,
  );
  console.log(
    'PASS: Boundary-sized lists save, all categories can be cleared, and expired sessions cannot write.',
  );
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
    `FAIL: Skills verification did not finish (${safeName}). No credentials displayed.`,
  );
  process.exitCode = 1;
} finally {
  await stop();
  if (mongoose.connection.readyState === 1) {
    try {
      await Session.deleteMany({ userId: { $in: ids } });
      await User.deleteMany({ _id: { $in: ids } });
      assert.equal(await User.countDocuments({ _id: { $in: ids } }), 0);
      assert.equal(await Session.countDocuments({ userId: { $in: ids } }), 0);
      console.log('PASS: Temporary skills accounts and sessions removed.');
    } catch {
      console.error('FAIL: Temporary fixture cleanup requires attention.');
      process.exitCode = 1;
    }
  }
  await mongoose.disconnect();
}
