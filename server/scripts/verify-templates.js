import 'dotenv/config';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { readFile, writeFile, unlink } from 'node:fs/promises';
import mongoose from 'mongoose';
import { createApp } from '../app.js';
import { User } from '../models/User.js';
import { Session } from '../models/Session.js';
import { hashPassword } from '../auth/passwords.js';
import { digestToken, SESSION_COOKIE } from '../auth/sessions.js';
import { toPublicPortfolio } from '../serializers/publicPortfolio.js';

const ids = [new mongoose.Types.ObjectId(), new mongoose.Types.ObjectId()];
const suffix = randomBytes(6).toString('hex');
const emails = ids.map((_, i) => `templates-${i}-${suffix}@example.invalid`);
const password = `Temporary templates ${randomBytes(12).toString('hex')}`;
let server;
let base;
let createdFixtures = false;
let ownsControlFile = false;
let stopRequested = false;
const controlPath = fileURLToPath(new URL('../../.template-qa-control', import.meta.url));
process.on('SIGINT', () => {
  stopRequested = true;
});
const connect = () =>
  mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000, autoIndex: false });
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
async function request(
  cookie,
  { path = '/api/template', method = 'GET', body, headers = {} } = {},
) {
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
async function write(cookie, templateId, version, extra = {}) {
  return request(cookie, { method: 'PUT', body: { templateId, version, ...extra } });
}

try {
  assert.ok(process.env.MONGODB_URI);
  if (process.argv.includes('--browser')) {
    await writeFile(controlPath, 'ready', { flag: 'wx' });
    ownsControlFile = true;
  }
  await connect();
  if (process.argv[2] === '--read') {
    const user = await User.findById(process.argv[3]);
    assert.ok(user);
    console.log(JSON.stringify({ templateId: user.templateId, version: user.__v }));
  } else {
    const passwordHash = await hashPassword(password);
    createdFixtures = true;
    for (let i = 0; i < ids.length; i++)
      await User.create({
        _id: ids[i],
        username: `templates-${i}-${suffix}`,
        email: emails[i],
        passwordHash,
        templateId: i === 0 ? 'minimalist' : 'cyberpunk',
        tier: 'free',
        profile: {
          name: `Template Check ${i + 1}`,
          bio: 'A temporary portfolio for verifying template selection.',
          resumeUrl: 'https://example.com/resume.pdf',
          socialLinks: [{ label: 'GitHub', url: 'https://github.com/' }],
        },
        projects: [
          {
            title: 'Portfolio Builder',
            description: 'One saved project displayed through two different layouts.',
            techStack: ['React', 'Tailwind CSS', 'Express'],
            repoLink: 'https://github.com/',
            liveLink: 'https://example.com/',
          },
        ],
        skills: {
          frontend: ['React', 'Tailwind CSS'],
          backend: ['Express', 'MongoDB'],
          devops: ['Git'],
        },
      });
    await start();
    let cookie = await login(0);
    const peerCookie = await login(1);
    const initial = (await request(cookie)).body;
    const peer = (await request(peerCookie)).body;
    assert.deepEqual(Object.keys(initial).sort(), ['portfolio', 'version']);
    assert.equal(initial.portfolio.templateId, 'bento');
    assert.equal(peer.portfolio.templateId, 'split-screen');
    assert.equal((await User.findById(ids[0])).templateId, 'minimalist');
    assert.equal((await request(null)).response.status, 401);
    assert.equal((await write(null, 'bento', 0)).response.status, 401);
    assert.equal((await request(cookie)).response.headers.get('cache-control'), 'no-store');
    const profile = (await request(cookie, { path: '/api/profile' })).body;
    assert.equal(
      (await request(cookie, { path: '/api/profile', method: 'PUT', body: profile })).response
        .status,
      200,
    );
    assert.equal((await User.findById(ids[0])).templateId, 'minimalist');
    console.log(
      'PASS: Legacy IDs resolve without read-time rewrites; existing profile saves still work and previews require authentication.',
    );

    const before = await User.findById(ids[0]).select('+email +passwordHash').lean();
    let saved = (await request(cookie)).body;
    let result = await write(cookie, 'split-screen', saved.version);
    assert.equal(result.response.status, 200);
    saved = result.body;
    assert.equal(saved.portfolio.templateId, 'split-screen');
    assert.ok(saved.version > before.__v);
    const after = await User.findById(ids[0]).select('+email +passwordHash').lean();
    assert.equal(after.templateId, 'split-screen');
    for (const key of [
      '_id',
      'username',
      'email',
      'passwordHash',
      'tier',
      'profile',
      'projects',
      'skills',
      'createdAt',
    ])
      assert.deepEqual(after[key], before[key]);
    assert.deepEqual((await request(peerCookie)).body, peer);
    assert.deepEqual(saved.portfolio, toPublicPortfolio(after));
    for (const value of [after.email, after.passwordHash, String(after._id)])
      assert.ok(!JSON.stringify(saved).includes(value));
    assert.equal(
      (await request(cookie, { path: '/api/portfolio/preview' })).body.portfolio.templateId,
      'split-screen',
    );
    assert.equal(
      (await request(cookie, { path: '/api/auth/me' })).body.user.templateId,
      'split-screen',
    );
    console.log(
      'PASS: Canonical selection persists in Atlas, reaches the saved preview/auth response, preserves all other content and leaves the peer unchanged.',
    );

    assert.equal((await write(cookie, 'bento', initial.version)).response.status, 409);
    for (const templateId of ['minimalist', 'cyberpunk', 'unknown', '__proto__', {}, null, 1])
      assert.equal((await write(cookie, templateId, saved.version)).response.status, 400);
    for (const extra of [
      { userId: String(ids[1]) },
      { username: peer.portfolio.username },
      { tier: 'pro' },
      { profile: {} },
      { $set: { templateId: 'bento' } },
    ])
      assert.equal((await write(cookie, 'bento', saved.version, extra)).response.status, 400);
    for (const query of [`?userId=${ids[1]}`, `?username=${peer.portfolio.username}`])
      assert.equal((await request(cookie, { path: `/api/template${query}` })).response.status, 400);
    assert.equal(
      (
        await request(cookie, {
          path: `/api/template/${ids[1]}`,
          method: 'PUT',
          body: { templateId: 'bento', version: saved.version },
        })
      ).response.status,
      404,
    );
    assert.equal(
      (
        await request(cookie, {
          method: 'PUT',
          headers: { Origin: 'https://untrusted.example' },
          body: { templateId: 'bento', version: saved.version },
        })
      ).response.status,
      403,
    );
    assert.deepEqual((await request(cookie)).body, saved);
    console.log(
      'PASS: Invalid/obsolete choices, account selectors, privilege injection, stale versions and cross-origin writes cannot change saved data.',
    );

    const raced = await Promise.all(
      ['bento', 'split-screen'].map((id) => write(cookie, id, saved.version)),
    );
    assert.deepEqual(raced.map((item) => item.response.status).sort(), [200, 409]);
    saved = (await request(cookie)).body;
    const staleSkills = (await request(cookie, { path: '/api/skills' })).body;
    result = await write(cookie, 'bento', saved.version);
    assert.equal(result.response.status, 200);
    saved = result.body;
    assert.equal(
      (await request(cookie, { path: '/api/skills', method: 'PUT', body: staleSkills })).response
        .status,
      409,
    );
    const updatedProfile = (await request(cookie, { path: '/api/profile' })).body;
    assert.equal(
      (await request(cookie, { path: '/api/profile', method: 'PUT', body: updatedProfile }))
        .response.status,
      200,
    );
    assert.equal((await write(cookie, 'split-screen', saved.version)).response.status, 409);
    saved = (await request(cookie)).body;
    console.log(
      'PASS: Racing template writes and cross-section edits reject stale snapshots instead of overwriting each other.',
    );

    const child = spawnSync(
      process.execPath,
      [fileURLToPath(import.meta.url), '--read', String(ids[0])],
      { encoding: 'utf8', timeout: 20000, windowsHide: true },
    );
    assert.equal(child.status, 0);
    assert.deepEqual(JSON.parse(child.stdout), { templateId: 'bento', version: saved.version });
    await request(cookie, { path: '/api/auth/logout', method: 'POST', body: {} });
    assert.equal((await request(cookie)).response.status, 401);
    cookie = await login(0);
    await stop();
    await start();
    assert.deepEqual((await request(cookie)).body, saved);
    console.log(
      'PASS: Template choice survives a fresh Node process, logout/login and API-instance recreation.',
    );

    await User.collection.updateOne(
      { _id: ids[0] },
      { $set: { templateId: 'future-layout' }, $inc: { __v: 1 } },
    );
    saved = (await request(cookie)).body;
    assert.equal(saved.portfolio.templateId, 'bento');
    assert.equal((await User.findById(ids[0])).templateId, 'future-layout');
    result = await write(cookie, 'bento', saved.version);
    assert.equal(result.response.status, 200);
    saved = result.body;
    await Session.updateOne(
      { tokenHash: digestToken(cookie.slice(SESSION_COOKIE.length + 1)) },
      { expiresAt: new Date(Date.now() - 1000) },
    );
    assert.equal((await request(cookie)).response.status, 401);
    assert.equal((await write(cookie, 'split-screen', saved.version)).response.status, 401);
    console.log(
      'PASS: Unknown stored IDs fall back without read-time writes, can be replaced by a valid choice, and expired sessions cannot read or save.',
    );

    if (process.argv.includes('--browser')) {
      console.log(`BROWSER_FIXTURE ${JSON.stringify({ email: emails[0], password })}`);
      let previousCommand = 'ready';
      // Local command file controls only these two disposable fixtures. No credentials are written to disk.
      while (!stopRequested) {
        await new Promise((resolve) => setTimeout(resolve, 250));
        const raw = (await readFile(controlPath, 'utf8')).trim();
        if (raw === previousCommand) continue;
        previousCommand = raw;
        const command = raw.split(/\r?\n/)[0];
        if (command === 'cleanup') break;
        if (command === 'conflict') await User.updateOne({ _id: ids[0] }, { $inc: { __v: 1 } });
        else if (['bento', 'split-screen', 'minimalist', 'cyberpunk', 'unknown'].includes(command))
          await User.collection.updateOne(
            { _id: ids[0] },
            {
              $set: { templateId: command === 'unknown' ? 'future-layout' : command },
              $inc: { __v: 1 },
            },
          );
        else if (command === 'expire')
          await Session.updateMany({ userId: ids[0] }, { expiresAt: new Date(Date.now() - 1000) });
        else {
          console.log('Unknown browser-check command.');
          continue;
        }
        console.log(`BROWSER_COMMAND_READY ${command}`);
      }
    }
  }
} catch (error) {
  console.error(
    `FAIL: Template verification (${error.name}). No connection strings or account credentials are logged.`,
  );
  process.exitCode = 1;
  const codes = [...(error.reason?.servers?.values() || [])]
    .map((server) => server.error?.cause?.code || server.error?.code)
    .filter(Boolean);
  if (codes.length) console.error(`Connection codes: ${[...new Set(codes)].join(', ')}`);
} finally {
  await stop();
  if (createdFixtures) {
    try {
      if (mongoose.connection.readyState !== 1) await connect();
      await Session.deleteMany({ userId: { $in: ids } });
      await User.deleteMany({ _id: { $in: ids } });
      assert.equal(await User.countDocuments({ _id: { $in: ids } }), 0);
      assert.equal(await Session.countDocuments({ userId: { $in: ids } }), 0);
      console.log('PASS: Exactly the two generated accounts and their sessions were removed.');
    } catch {
      console.error('FAIL: Template fixture cleanup requires attention.');
      process.exitCode = 1;
    }
  }
  await mongoose.disconnect();
  if (ownsControlFile) await unlink(controlPath).catch(() => {});
}
