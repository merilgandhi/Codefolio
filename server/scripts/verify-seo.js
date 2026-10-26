import 'dotenv/config';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { readFile, writeFile, unlink } from 'node:fs/promises';
import mongoose from 'mongoose';
import { createApp } from '../app.js';
import { User } from '../models/User.js';
import { Session } from '../models/Session.js';
import { hashPassword } from '../auth/passwords.js';

const ids = [new mongoose.Types.ObjectId(), new mongoose.Types.ObjectId()];
const suffix = randomBytes(5).toString('hex');
const usernames = ['bento', 'split'].map((layout) => `seo-${layout}-${suffix}`);
const names = ['Avery Chen', 'Jordan Rivera'];
const bios = [
  'React developer building accessible interfaces and thoughtful tools for the web.',
  'Backend engineer building dependable APIs, cloud services and developer infrastructure.',
];
const emails = usernames.map((username) => `${username}@example.invalid`);
const password = `Temporary SEO ${randomBytes(12).toString('hex')}`;
const controlPath = new URL('../../.seo-qa-control', import.meta.url);
const browser = process.argv.includes('--browser');
let server, base, passwordHash;
let created = false,
  ownsControl = false,
  unavailable = false,
  stopping = false;
process.on('SIGINT', () => {
  stopping = true;
});
const connect = () =>
  mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 7000,
    socketTimeoutMS: 10000,
    autoIndex: false,
  });
const headers = { 'Content-Type': 'application/json', 'X-Codefolio-Request': '1' };
async function request(origin, path, options = {}) {
  return fetch(origin + path, { ...options, signal: AbortSignal.timeout(12000) });
}
function checkHead(html, title, description, robots = 'index, follow') {
  assert.equal((html.match(/<title\b/g) || []).length, 1);
  assert.equal((html.match(/name="description"/g) || []).length, 1);
  assert.equal((html.match(/name="robots"/g) || []).length, 1);
  assert.ok(html.includes(`>${title}</title>`));
  assert.ok(html.includes(`name="description" content="${description}"`));
  assert.ok(html.includes(`name="robots" content="${robots}"`));
  for (const secret of [...emails, ...ids.map(String), passwordHash])
    assert.ok(!html.includes(secret), 'Private account data must not appear in HTML.');
}

try {
  assert.ok(process.env.MONGODB_URI, 'Configure the local MongoDB URI first.');
  if (browser) {
    await writeFile(controlPath, 'ready', { flag: 'wx' });
    ownsControl = true;
  }
  await connect();
  passwordHash = await hashPassword(password);
  created = true;
  for (let i = 0; i < ids.length; i++) {
    await User.create({
      _id: ids[i],
      username: usernames[i],
      email: emails[i],
      passwordHash,
      templateId: i === 0 ? 'bento' : 'split-screen',
      profile: { name: names[i], bio: bios[i] },
      projects: [
        {
          title: i === 0 ? 'Accessible UI Kit' : 'Developer API',
          description: 'Tools designed to make everyday development clearer and more dependable.',
          techStack: i === 0 ? ['React', 'Tailwind CSS'] : ['Node.js', 'MongoDB'],
          repoLink: 'https://github.com/',
        },
      ],
      skills: {
        frontend: ['React', 'Tailwind CSS'],
        backend: ['Node.js', 'MongoDB'],
        devops: ['Git'],
      },
    });
  }
  server = createApp({
    production: true,
    getDatabaseStatus: () => (unavailable ? 'disconnected' : 'connected'),
  }).listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
  for (let i = 0; i < ids.length; i++) {
    for (const origin of [base, 'http://127.0.0.1:5174']) {
      const response = await request(origin, `/${usernames[i]}`, {
        headers: { Accept: 'text/html' },
      });
      assert.equal(response.status, 200);
      const html = await response.text();
      checkHead(html, `${names[i]} | Developer Portfolio`, bios[i]);
      assert.ok(!html.includes(bios[1 - i]));
      if (origin === base) {
        const asset = html.match(/src="(\/assets\/[^\"]+\.js)"/)[1];
        const response = await request(base, asset);
        assert.equal(response.status, 200);
        await response.arrayBuffer();
      }
    }
  }
  console.log(
    'PASS: Two Atlas profiles have distinct Helmet titles and bio descriptions in initial production and Vite HTML, with no duplicates or private data; built assets load.',
  );

  const login = await request(base, '/api/auth/login', {
    method: 'POST',
    headers,
    body: JSON.stringify({ email: emails[0], password }),
  });
  assert.equal(login.status, 200);
  await login.json();
  const cookie = login.headers.get('set-cookie').split(';')[0];
  const saved = await (await request(base, '/api/profile', { headers: { Cookie: cookie } })).json();
  let version = saved.version;
  for (const bio of ['', 'A saved biography now describes this developer portfolio.', bios[0]]) {
    const response = await request(base, '/api/profile', {
      method: 'PUT',
      headers: { ...headers, Cookie: cookie },
      body: JSON.stringify({ profile: { ...saved.profile, bio }, version }),
    });
    assert.equal(response.status, 200);
    version = (await response.json()).version;
    const html = await (await request(base, `/${usernames[0]}`)).text();
    const description = bio || 'Explore Avery Chen&#x27;s projects, skills and development work.';
    checkHead(html, 'Avery Chen | Developer Portfolio', description);
    checkHead(
      await (await request(base, `/${usernames[1]}`)).text(),
      'Jordan Rivera | Developer Portfolio',
      bios[1],
    );
  }
  console.log(
    'PASS: Owner API saves update fresh anonymous metadata, empty bios have a useful fallback, and the other profile stays independent.',
  );

  const alias = await request(base, `/user/${usernames[0]}`, { redirect: 'manual' });
  assert.equal(alias.status, 308);
  assert.equal(alias.headers.get('location'), `/${usernames[0]}`);
  await alias.text();
  const missing = await request(base, `/seo-missing-${suffix}`);
  assert.equal(missing.status, 404);
  checkHead(
    await missing.text(),
    'Portfolio not found | CodeFolio',
    'This developer portfolio could not be found. Check the username in the link.',
    'noindex, nofollow',
  );
  unavailable = true;
  const down = await request(base, `/${usernames[0]}`);
  assert.equal(down.status, 503);
  checkHead(
    await down.text(),
    'Portfolio unavailable | CodeFolio',
    'This developer portfolio is temporarily unavailable. Please try again shortly.',
    'noindex, nofollow',
  );
  unavailable = false;
  for (const [path, title] of [
    ['/login', 'Sign in'],
    ['/register', 'Create an account'],
    ['/dashboard', 'Your workspace'],
  ]) {
    const response = await request(base, path);
    assert.equal(response.status, 200);
    checkHead(
      await response.text(),
      `${title} | CodeFolio`,
      'Manage your developer portfolio in your private CodeFolio workspace.',
      'noindex, nofollow',
    );
  }
  console.log(
    'PASS: Canonical alias, missing/unavailable pages and private account routes have the correct metadata and indexing rules.',
  );
  if (browser) {
    console.log(`BROWSER_SEO ${JSON.stringify({ base, usernames, names, bios })}`);
    let previous = 'ready';
    while (!stopping) {
      await new Promise((resolve) => setTimeout(resolve, 250));
      const command = (await readFile(controlPath, 'utf8')).trim();
      if (command === previous) continue;
      previous = command;
      if (command === 'cleanup') break;
      if (command === 'unavailable' || command === 'available')
        unavailable = command === 'unavailable';
      else if (command === 'empty-bio' || command === 'restore-bio') {
        await User.updateOne(
          { _id: ids[0] },
          { $set: { 'profile.bio': command === 'empty-bio' ? '' : bios[0] } },
          { runValidators: true },
        );
      } else {
        console.log('Unknown SEO browser-check command.');
        continue;
      }
      console.log(`BROWSER_SEO_READY ${command}`);
    }
  }
} catch (error) {
  console.error(
    `FAIL: SEO verification (${error.name}). Connection strings and credentials are not logged.`,
  );
  if (error.name === 'AssertionError')
    console.error(
      `Check: ${
        error.stack
          ?.split('\n')
          .find((line) => line.includes('verify-seo.js'))
          ?.trim() || 'SEO assertion'
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
      console.log('PASS: Exactly the two generated SEO accounts and their sessions were removed.');
    } catch {
      console.error('FAIL: SEO fixture cleanup requires attention.');
      process.exitCode = 1;
    }
  }
  await mongoose.disconnect();
  if (ownsControl) await unlink(controlPath).catch(() => {});
}
