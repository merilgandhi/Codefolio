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
const password = `Temporary profile verification ${randomBytes(8).toString('hex')}`;
const emails = [`profile-a-${suffix}@example.invalid`, `profile-b-${suffix}@example.invalid`];
let server;
let base;
async function request(cookie, { method = 'GET', body, path = '/api/profile', headers = {} } = {}) {
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
  const { response } = await request(null, {
    method: 'POST',
    path: '/api/auth/login',
    body: { email: emails[index], password },
  });
  assert.equal(response.status, 200);
  return response.headers.get('set-cookie').split(';')[0];
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
      username: `profile-${i}-${suffix}`,
      email: emails[i],
      passwordHash,
      profile: { name: `Original ${i}` },
      tier: 'pro',
      templateId: 'cyberpunk',
      projects: [{ title: 'Keep this project', description: 'Must survive profile saves.' }],
      skills: { frontend: ['React'], backend: ['Express'], devops: ['Docker'] },
    });
  server = createApp({ getDatabaseStatus: () => 'connected' }).listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
  const cookies = [await login(0), await login(1)];
  assert.equal((await request(null)).response.status, 401);
  assert.equal((await request(null, { method: 'PUT', body: {} })).response.status, 401);
  const first = (await request(cookies[0])).body;
  const peer = (await request(cookies[1])).body;
  assert.equal(first.profile.name, 'Original 0');
  assert.equal(peer.profile.name, 'Original 1');
  assert.deepEqual(Object.keys(first).sort(), ['profile', 'version']);
  console.log(
    'PASS: Profile reads require a session and return only the current account profile and version.',
  );

  const profile = {
    name: ' Updated Name ',
    bio: ' Developer bio ',
    resumeUrl: 'https://example.com/resume.pdf',
    socialLinks: [
      { label: 'GitHub', url: 'https://github.com/example' },
      { label: 'LinkedIn', url: 'https://www.linkedin.com/in/example' },
    ],
  };
  const update = await request(cookies[0], {
    method: 'PUT',
    body: { profile, version: first.version },
  });
  assert.equal(update.response.status, 200);
  assert.equal(update.body.profile.name, 'Updated Name');
  assert.equal(update.body.profile.bio, 'Developer bio');
  assert.equal(update.body.profile.resumeUrl, profile.resumeUrl);
  assert.deepEqual(update.body.profile.socialLinks, profile.socialLinks);
  assert.ok(update.body.version > first.version);
  assert.deepEqual((await request(cookies[0])).body, update.body);
  assert.equal(
    (await request(cookies[0], { path: '/api/auth/me' })).body.user.name,
    'Updated Name',
  );
  console.log(
    'PASS: Every profile field saves to Atlas, reloads through the API and updates account display name.',
  );

  assert.equal(
    (
      await request(cookies[0], {
        method: 'PUT',
        body: { profile: { name: 'Stale edit' }, version: first.version },
      })
    ).response.status,
    409,
  );
  for (const extra of [
    { userId: String(ids[1]) },
    { tier: 'free' },
    { email: emails[1] },
    { templateId: 'minimalist' },
    { $set: { tier: 'free' } },
  ]) {
    assert.equal(
      (
        await request(cookies[0], {
          method: 'PUT',
          body: { profile: { name: 'Injected' }, version: update.body.version, ...extra },
        })
      ).response.status,
      400,
    );
  }
  assert.equal(
    (await request(cookies[0], { path: `/api/profile?userId=${ids[1]}` })).response.status,
    400,
  );
  assert.equal(
    (
      await request(cookies[0], {
        method: 'PUT',
        path: `/api/profile/${ids[1]}`,
        body: { profile, version: 0 },
      })
    ).response.status,
    404,
  );
  assert.deepEqual((await request(cookies[1])).body, peer);
  const record = await User.findById(ids[0]).select('+email +passwordHash');
  assert.equal(record.email, emails[0]);
  assert.equal(record.passwordHash, passwordHash);
  assert.equal(record.tier, 'pro');
  assert.equal(record.templateId, 'cyberpunk');
  assert.equal(record.projects[0].title, 'Keep this project');
  assert.deepEqual([...record.skills.frontend], ['React']);
  console.log(
    'PASS: Stale saves, account selectors and privileged fields are rejected; the other account, projects and skills stay unchanged.',
  );

  for (const badProfile of [
    { name: '' },
    { name: 'Bad link', resumeUrl: 'javascript:alert(1)' },
    {
      name: 'Too many',
      socialLinks: Array.from({ length: 11 }, () => ({
        label: 'GitHub',
        url: 'https://github.com',
      })),
    },
    { name: 'Wrong type', bio: {} },
  ]) {
    assert.equal(
      (
        await request(cookies[0], {
          method: 'PUT',
          body: { profile: badProfile, version: update.body.version },
        })
      ).response.status,
      400,
    );
  }
  assert.equal(
    (
      await request(cookies[0], {
        method: 'PUT',
        headers: { Origin: 'https://untrusted.example' },
        body: { profile, version: update.body.version },
      })
    ).response.status,
    403,
  );
  assert.deepEqual((await request(cookies[0])).body, update.body);
  console.log(
    'PASS: Invalid text, unsafe URLs, excess links and cross-origin writes cannot change saved data.',
  );

  const cleared = await request(cookies[0], {
    method: 'PUT',
    body: {
      profile: { name: 'Updated Name', bio: '', resumeUrl: '', socialLinks: [] },
      version: update.body.version,
    },
  });
  assert.equal(cleared.response.status, 200);
  assert.deepEqual(cleared.body.profile.socialLinks, []);
  await request(cookies[0], { method: 'POST', path: '/api/auth/logout', body: {} });
  const newCookie = await login(0);
  assert.deepEqual((await request(newCookie)).body, cleared.body);
  console.log(
    'PASS: Optional fields and social links can be removed; saved data survives logout/login.',
  );

  await Session.updateOne(
    { tokenHash: digestToken(newCookie.slice(SESSION_COOKIE.length + 1)) },
    { expiresAt: new Date(Date.now() - 1000) },
  );
  assert.equal(
    (await request(newCookie, { method: 'PUT', body: { profile, version: cleared.body.version } }))
      .response.status,
    401,
  );
  console.log('PASS: Expired sessions cannot save profile edits.');
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
    `FAIL: Profile verification did not finish (${safeName}). No credentials displayed.`,
  );
  process.exitCode = 1;
} finally {
  if (server) await new Promise((resolve) => server.close(resolve));
  if (mongoose.connection.readyState === 1) {
    try {
      await Session.deleteMany({ userId: { $in: ids } });
      await User.deleteMany({ _id: { $in: ids } });
      assert.equal(await User.countDocuments({ _id: { $in: ids } }), 0);
      assert.equal(await Session.countDocuments({ userId: { $in: ids } }), 0);
      console.log('PASS: Temporary profile accounts and sessions removed.');
    } catch {
      console.error('FAIL: Temporary fixture cleanup requires attention.');
      process.exitCode = 1;
    }
  }
  await mongoose.disconnect();
}
