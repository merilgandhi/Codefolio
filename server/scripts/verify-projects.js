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
const emails = ids.map((_, i) => `projects-${i}-${suffix}@example.invalid`);
const password = `Temporary project check ${randomBytes(8).toString('hex')}`;
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
async function request(
  cookie,
  { path = '/api/projects', method = 'GET', body, headers = {} } = {},
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
      username: `projects-${i}-${suffix}`,
      email: emails[i],
      passwordHash,
      profile: { name: `Project owner ${i}`, bio: 'Keep my profile.' },
      tier: 'pro',
      templateId: 'cyberpunk',
      skills: { frontend: ['React'], backend: ['Express'], devops: ['Docker'] },
      projects: [{ title: `Original project ${i}`, description: 'Existing project.' }],
    });
  await start();
  let cookie = await login(0);
  const peerCookie = await login(1);
  const original = (await request(cookie)).body;
  const peer = (await request(peerCookie)).body;
  const protectedBefore = await User.findById(ids[0]).select('+email +passwordHash').lean();
  assert.deepEqual(Object.keys(original).sort(), ['projects', 'version']);
  assert.equal((await request(null)).response.status, 401);
  for (const method of ['POST', 'PUT', 'DELETE'])
    assert.equal(
      (
        await request(null, {
          method,
          path: method === 'POST' ? '/api/projects' : `/api/projects/${original.projects[0].id}`,
          body: { version: 0 },
        })
      ).response.status,
      401,
    );
  console.log(
    'PASS: Project APIs require an active session and expose only project content and version.',
  );

  const project = {
    title: ' New App ',
    description: ' A full project description. ',
    techStack: [' React ', 'Node.js'],
    repoLink: 'https://github.com/example/app',
    liveLink: 'https://example.com',
    screenshot: 'https://example.com/app.webp',
  };
  let result = await request(cookie, {
    method: 'POST',
    body: { project, version: original.version },
  });
  assert.equal(result.response.status, 201);
  assert.equal(result.body.projects.length, 2);
  assert.equal(result.body.projects[0].id, original.projects[0].id);
  const added = result.body.projects[1];
  assert.equal(added.title, 'New App');
  assert.equal(added.description, 'A full project description.');
  assert.deepEqual(added.techStack, ['React', 'Node.js']);
  for (const key of ['repoLink', 'liveLink', 'screenshot']) assert.equal(added[key], project[key]);
  const firstVersion = result.body.version;
  const updatedProject = {
    ...project,
    title: 'Updated App',
    description: 'Updated description.',
    techStack: ['Express'],
    screenshot: '',
  };
  result = await request(cookie, {
    method: 'PUT',
    path: `/api/projects/${added.id}`,
    body: { project: updatedProject, version: firstVersion },
  });
  assert.equal(result.response.status, 200);
  assert.equal(result.body.projects[1].id, added.id);
  assert.equal(result.body.projects[1].title, 'Updated App');
  assert.deepEqual(result.body.projects[1].techStack, ['Express']);
  assert.equal(result.body.projects[1].screenshot, '');
  const saved = result.body;
  assert.deepEqual((await request(cookie)).body, saved);
  console.log(
    'PASS: Create and edit persist all six fields; arrays and stable project IDs reload correctly.',
  );

  assert.equal(
    (await request(cookie, { method: 'POST', body: { project, version: original.version } }))
      .response.status,
    409,
  );
  for (const method of ['PUT', 'DELETE']) {
    assert.equal(
      (
        await request(cookie, {
          method,
          path: `/api/projects/${peer.projects[0].id}`,
          body: { ...(method === 'PUT' ? { project } : {}), version: saved.version },
        })
      ).response.status,
      404,
    );
    assert.equal(
      (
        await request(cookie, {
          method,
          path: '/api/projects/not-an-id',
          body: { ...(method === 'PUT' ? { project } : {}), version: saved.version },
        })
      ).response.status,
      404,
    );
    assert.equal(
      (
        await request(cookie, {
          method,
          path: `/api/projects/${added.id}`,
          body: { ...(method === 'PUT' ? { project } : {}), version: original.version },
        })
      ).response.status,
      409,
    );
  }
  for (const extra of [
    { userId: String(ids[1]) },
    { tier: 'free' },
    { email: emails[1] },
    { $set: { profile: { name: 'Injected' } } },
  ]) {
    assert.equal(
      (
        await request(cookie, {
          method: 'POST',
          body: { project, version: saved.version, ...extra },
        })
      ).response.status,
      400,
    );
  }
  assert.equal(
    (await request(cookie, { path: `/api/projects?userId=${ids[1]}` })).response.status,
    400,
  );
  assert.deepEqual((await request(peerCookie)).body, peer);
  const protectedAfter = await User.findById(ids[0]).select('+email +passwordHash').lean();
  for (const key of ['profile', 'skills', 'email', 'passwordHash', 'tier', 'templateId'])
    assert.deepEqual(protectedAfter[key], protectedBefore[key]);
  console.log(
    'PASS: Foreign project IDs, stale saves and account/privilege selectors are rejected; peer and non-project data stay unchanged.',
  );

  for (const badProject of [
    { ...project, title: '' },
    { ...project, description: '' },
    { ...project, techStack: 'React' },
    { ...project, techStack: ['React', 'react'] },
    { ...project, repoLink: 'javascript:alert(1)' },
    { ...project, _id: peer.projects[0].id },
  ]) {
    assert.equal(
      (
        await request(cookie, {
          method: 'POST',
          body: { project: badProject, version: saved.version },
        })
      ).response.status,
      400,
    );
  }
  assert.equal(
    (
      await request(cookie, {
        method: 'DELETE',
        path: `/api/projects/${added.id}`,
        body: { version: saved.version },
        headers: { Origin: 'https://untrusted.example' },
      })
    ).response.status,
    403,
  );
  assert.deepEqual((await request(cookie)).body, saved);
  console.log(
    'PASS: Invalid content, unsafe URLs, duplicate technologies and cross-origin writes do not change data.',
  );

  // Race two valid edits with one version: at most one may win.
  const raced = await Promise.all(
    ['Race A', 'Race B'].map((title) =>
      request(cookie, {
        method: 'PUT',
        path: `/api/projects/${added.id}`,
        body: { project: { ...updatedProject, title }, version: saved.version },
      }),
    ),
  );
  assert.deepEqual(raced.map((result) => result.response.status).sort(), [200, 409]);
  const afterRace = (await request(cookie)).body;
  await request(cookie, { method: 'POST', path: '/api/auth/logout', body: {} });
  cookie = await login(0);
  await stop();
  await start();
  assert.deepEqual((await request(cookie)).body, afterRace);
  console.log(
    'PASS: Concurrent edits cannot overwrite each other; projects survive logout/login and server recreation.',
  );

  result = await request(cookie, {
    method: 'DELETE',
    path: `/api/projects/${added.id}`,
    body: { version: afterRace.version },
  });
  assert.equal(result.response.status, 200);
  assert.equal(result.body.projects.length, 1);
  assert.equal(result.body.projects[0].id, original.projects[0].id);
  assert.equal(
    (
      await request(cookie, {
        method: 'DELETE',
        path: `/api/projects/${added.id}`,
        body: { version: result.body.version },
      })
    ).response.status,
    404,
  );
  const last = await request(cookie, {
    method: 'DELETE',
    path: `/api/projects/${original.projects[0].id}`,
    body: { version: result.body.version },
  });
  assert.equal(last.response.status, 200);
  assert.deepEqual(last.body.projects, []);
  assert.deepEqual((await request(cookie)).body.projects, []);
  console.log(
    'PASS: Delete removes only the selected owned project; deleting the last project leaves a persistent empty list.',
  );

  const user = await User.findById(ids[0]);
  user.projects = Array.from({ length: 50 }, (_, index) => ({
    title: `Limit ${index}`,
    description: 'Limit fixture.',
  }));
  await user.save();
  assert.equal(
    (await request(cookie, { method: 'POST', body: { project, version: user.__v } })).response
      .status,
    400,
  );
  await Session.updateOne(
    { tokenHash: digestToken(cookie.slice(SESSION_COOKIE.length + 1)) },
    { expiresAt: new Date(Date.now() - 1000) },
  );
  assert.equal(
    (await request(cookie, { method: 'POST', body: { project, version: user.__v } })).response
      .status,
    401,
  );
  console.log('PASS: The 50-project limit and session expiry are enforced server-side.');
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
    `FAIL: Project verification did not finish (${safeName}). No credentials displayed.`,
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
      console.log('PASS: Temporary project accounts and sessions removed.');
    } catch {
      console.error('FAIL: Temporary fixture cleanup requires attention.');
      process.exitCode = 1;
    }
  }
  await mongoose.disconnect();
}
