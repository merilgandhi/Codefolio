import 'dotenv/config';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { readFile, writeFile, unlink } from 'node:fs/promises';
import mongoose from 'mongoose';
import { createApp } from '../app.js';
import { User } from '../models/User.js';
import { Session } from '../models/Session.js';
import { hashPassword } from '../auth/passwords.js';
import { toPublicPortfolio } from '../serializers/publicPortfolio.js';

const ids = [new mongoose.Types.ObjectId(), new mongoose.Types.ObjectId()];
const suffix = randomBytes(5).toString('hex');
const usernames = ['bento', 'split'].map((layout) => `public-${layout}-${suffix}`);
const emails = usernames.map((username) => `${username}@example.invalid`);
const password = `Temporary public ${randomBytes(12).toString('hex')}`;
const controlPath = new URL('../../.public-qa-control', import.meta.url);
let server,
  base,
  created = false,
  ownsControl = false,
  stopping = false,
  unavailable = false;
process.on('SIGINT', () => {
  stopping = true;
});
const connect = () =>
  mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 7000, autoIndex: false });
async function json(path, options) {
  const response = await fetch(base + path, options);
  return { response, body: await response.json() };
}
const headers = { 'Content-Type': 'application/json', 'X-Codefolio-Request': '1' };
function publicData(html) {
  return JSON.parse(
    html.match(/<script type="application\/json" id="codefolio-public-data">(.*?)<\/script>/s)[1],
  );
}

try {
  assert.ok(process.env.MONGODB_URI, 'Configure the local MongoDB URI first.');
  if (process.argv.includes('--browser')) {
    await writeFile(controlPath, 'ready', { flag: 'wx' });
    ownsControl = true;
  }
  await connect();
  const passwordHash = await hashPassword(password);
  created = true;
  for (let i = 0; i < ids.length; i++)
    await User.create({
      _id: ids[i],
      username: usernames[i],
      email: emails[i],
      passwordHash,
      templateId: i === 0 ? 'bento' : 'split-screen',
      tier: 'free',
      profile: {
        name: i === 0 ? 'Avery Chen' : 'Jordan Rivera',
        bio: 'Full-stack developer crafting thoughtful digital experiences. I build accessible interfaces and dependable APIs with React, Node.js and MongoDB.',
        resumeUrl: 'https://example.com/resume.pdf',
        socialLinks: [
          { label: 'GitHub', url: 'https://github.com/' },
          { label: 'LinkedIn', url: 'https://www.linkedin.com/' },
        ],
      },
      projects: [
        {
          title: 'CodeFolio',
          description:
            'A portfolio builder that brings developer stories and projects together in one thoughtful workspace.',
          techStack: ['React', 'Tailwind CSS', 'MongoDB'],
          repoLink: 'https://github.com/',
          liveLink: 'https://example.com/',
          screenshot: '',
        },
        {
          title: 'Developer Toolkit',
          description:
            'Small tools that make everyday development faster, clearer and more accessible.',
          techStack: ['Node.js', 'Express'],
          repoLink: 'https://github.com/',
          liveLink: '',
          screenshot: '',
        },
      ],
      skills: {
        frontend: ['React', 'Tailwind CSS', 'JavaScript'],
        backend: ['Node.js', 'Express', 'MongoDB'],
        devops: ['Git', 'GitHub Actions'],
      },
    });
  server = createApp({
    production: true,
    getDatabaseStatus: () => (unavailable ? 'disconnected' : 'connected'),
  }).listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
  for (let i = 0; i < ids.length; i++) {
    const user = await User.findById(ids[i]).select('+email +passwordHash').lean();
    const expected = toPublicPortfolio(user);
    const api = await json(`/api/portfolios/${usernames[i]}`);
    assert.equal(api.response.status, 200);
    assert.deepEqual(api.body, { portfolio: expected });
    const page = await fetch(`${base}/${usernames[i]}`);
    assert.equal(page.status, 200);
    assert.equal(page.headers.get('cache-control'), 'no-store');
    assert.equal(page.headers.get('set-cookie'), null);
    assert.equal(api.response.headers.get('set-cookie'), null);
    const html = await page.text();
    assert.deepEqual(publicData(html), {
      status: 200,
      username: usernames[i],
      portfolio: expected,
    });
    for (const content of [html, JSON.stringify(api.body)]) {
      for (const secret of [emails[i], passwordHash, String(ids[i]), '"__v"', '"tier"'])
        assert.ok(!content.includes(secret));
    }
    const asset = html.match(/src="(\/assets\/[^\"]+\.js)"/)[1];
    const assetResponse = await fetch(base + asset);
    assert.equal(assetResponse.status, 200);
    assert.match(assetResponse.headers.get('content-type'), /javascript/);
    await assetResponse.arrayBuffer();
    const dev = await fetch(`http://127.0.0.1:5174/${usernames[i]}`, {
      headers: { Accept: 'text/html' },
    });
    assert.equal(dev.status, 200);
    assert.deepEqual(publicData(await dev.text()).portfolio, expected);
  }
  console.log(
    'PASS: Two real Atlas portfolios load anonymously through production HTML, public JSON and the Vite document proxy; public fields match, assets load and private account data is absent.',
  );

  const login = await json('/api/auth/login', {
    method: 'POST',
    headers,
    body: JSON.stringify({ email: emails[0], password }),
  });
  assert.equal(login.response.status, 200);
  const cookie = login.response.headers.get('set-cookie').split(';')[0];
  const saved = await json('/api/template', { headers: { Cookie: cookie } });
  const changed = await json('/api/template', {
    method: 'PUT',
    headers: { ...headers, Cookie: cookie },
    body: JSON.stringify({ templateId: 'split-screen', version: saved.body.version }),
  });
  assert.equal(changed.response.status, 200);
  assert.equal(
    (await json(`/api/portfolios/${usernames[0]}`)).body.portfolio.templateId,
    'split-screen',
  );
  assert.equal(
    publicData(await (await fetch(`${base}/${usernames[0]}`)).text()).portfolio.templateId,
    'split-screen',
  );
  const profile = await json('/api/profile', { headers: { Cookie: cookie } });
  const bio = `${profile.body.profile.bio} Saved changes are public.`;
  const updated = await json('/api/profile', {
    method: 'PUT',
    headers: { ...headers, Cookie: cookie },
    body: JSON.stringify({
      profile: { ...profile.body.profile, bio },
      version: profile.body.version,
    }),
  });
  assert.equal(updated.response.status, 200);
  assert.equal((await json(`/api/portfolios/${usernames[0]}`)).body.portfolio.profile.bio, bio);
  assert.equal(
    (await json(`/api/portfolios/${usernames[1]}`)).body.portfolio.profile.bio.includes(
      'Saved changes are public.',
    ),
    false,
  );
  const restored = await json('/api/template', {
    method: 'PUT',
    headers: { ...headers, Cookie: cookie },
    body: JSON.stringify({ templateId: 'bento', version: updated.body.version }),
  });
  assert.equal(restored.response.status, 200);
  console.log(
    'PASS: Authenticated layout/profile saves reach fresh anonymous reads and document refreshes without changing the second account.',
  );

  for (const path of [
    `/${usernames[0].toUpperCase()}`,
    `/user/${usernames[0]}`,
    `/${usernames[0]}/`,
  ]) {
    const response = await fetch(base + path, { redirect: 'manual' });
    assert.equal(response.status, 308);
    assert.equal(response.headers.get('location'), `/${usernames[0]}`);
  }
  for (const origin of [base, 'http://127.0.0.1:5174']) {
    const response = await fetch(`${origin}/public-missing-${suffix}`, {
      headers: { Accept: 'text/html' },
    });
    assert.equal(response.status, 404);
    assert.equal(publicData(await response.text()).status, 404);
  }
  assert.equal((await json('/api/portfolios/admin')).response.status, 404);
  assert.equal((await fetch(`${base}/assets/missing.js`)).status, 404);
  unavailable = true;
  assert.equal((await fetch(`${base}/${usernames[0]}`)).status, 503);
  assert.equal((await json(`/api/portfolios/${usernames[0]}`)).response.status, 503);
  unavailable = false;
  console.log(
    'PASS: Canonical redirects, showcase alias, true 404s, route precedence and unavailable responses work; anonymous reads do not create sessions.',
  );
  if (process.argv.includes('--browser')) {
    console.log(`BROWSER_PUBLIC ${JSON.stringify({ base, usernames })}`);
    let previous = 'ready';
    while (!stopping) {
      await new Promise((resolve) => setTimeout(resolve, 250));
      const command = (await readFile(controlPath, 'utf8')).trim();
      if (command === previous) continue;
      previous = command;
      if (command === 'cleanup') break;
      if (command === 'unavailable' || command === 'available')
        unavailable = command === 'unavailable';
      else {
        console.log('Unknown public browser-check command.');
        continue;
      }
      console.log(`BROWSER_PUBLIC_READY ${command}`);
    }
  }
} catch (error) {
  console.error(
    `FAIL: Public portfolio verification (${error.name}). Connection strings and credentials are not logged.`,
  );
  if (error.name === 'AssertionError')
    console.error(
      `Check: ${
        error.stack
          ?.split('\n')
          .find((line) => line.includes('verify-public.js'))
          ?.trim() || 'Public route assertion'
      }`,
    );
  process.exitCode = 1;
} finally {
  if (server)
    await new Promise((resolve) => {
      server.close(resolve);
      server.closeAllConnections();
    });
  if (created) {
    try {
      if (mongoose.connection.readyState !== 1) await connect();
      await Session.deleteMany({ userId: { $in: ids } });
      await User.deleteMany({ _id: { $in: ids } });
      assert.equal(await User.countDocuments({ _id: { $in: ids } }), 0);
      assert.equal(await Session.countDocuments({ userId: { $in: ids } }), 0);
      console.log('PASS: Exactly the two generated accounts and their sessions were removed.');
    } catch {
      console.error('FAIL: Public portfolio fixture cleanup requires attention.');
      process.exitCode = 1;
    }
  }
  await mongoose.disconnect();
  if (ownsControl) await unlink(controlPath).catch(() => {});
}
