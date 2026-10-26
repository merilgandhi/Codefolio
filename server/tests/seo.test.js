import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../app.js';
import { withDocumentMetadata } from '../seo.js';
import {
  HOME_METADATA,
  portfolioMetadata,
  publicPageMetadata,
  routeMetadata,
} from '../../shared/seo.js';

const html =
  '<!doctype html><html><head><title>Old title</title><meta\n name="description" content="Old description"><meta name="robots" content="old"><meta name="theme-color" content="#141218"></head><body><div id="root"></div></body></html>';
const users = ['avery', 'jordan'].map((username, index) => ({
  _id: `private-id-${index}`,
  username,
  email: `private-${index}@example.invalid`,
  passwordHash: 'private-hash',
  templateId: index ? 'split-screen' : 'bento',
  tier: 'free',
  profile: {
    name: index ? 'Jordan Rivera' : 'Avery Chen',
    bio: index
      ? 'Backend developer building dependable APIs.'
      : 'Frontend developer building accessible interfaces.',
    resumeUrl: '',
    socialLinks: [],
  },
  projects: [],
  skills: { frontend: [], backend: [], devops: [] },
}));

test('portfolio metadata uses only public name and bio, with whitespace normalization and safe fallbacks', () => {
  assert.deepEqual(
    portfolioMetadata({
      username: 'avery',
      profile: { name: '  Avery\n Chen ', bio: '  Frontend\n developer.  ' },
    }),
    {
      title: 'Avery Chen | Developer Portfolio',
      description: 'Frontend developer.',
      robots: 'index, follow',
    },
  );
  const empty = portfolioMetadata({ username: 'avery', profile: { name: ' ', bio: '\n ' } });
  assert.equal(empty.title, 'avery | Developer Portfolio');
  assert.match(empty.description, /avery.*projects, skills/);
  assert.ok(!JSON.stringify(portfolioMetadata(users[0])).includes('private'));
});

test('descriptions are bounded without splitting Unicode characters', () => {
  const metadata = portfolioMetadata({
    username: 'avery',
    profile: { name: 'Avery', bio: '🧑'.repeat(200) },
  });
  assert.equal(Array.from(metadata.description).length, 160);
  assert.ok(metadata.description.endsWith('…'));
  assert.ok(!/[\ud800-\udbff]$/.test(metadata.description));
});

test('account, missing and unavailable pages do not retain another portfolio metadata', () => {
  assert.deepEqual(routeMetadata('/'), HOME_METADATA);
  for (const path of ['/dashboard', '/login', '/register', '/unknown/nested']) {
    const metadata = routeMetadata(path);
    assert.equal(metadata.robots, 'noindex, nofollow');
    assert.ok(!metadata.title.includes('Avery'));
  }
  for (const status of [0, 404, 503])
    assert.equal(publicPageMetadata({ status }).robots, 'noindex, nofollow');
  assert.equal(publicPageMetadata({ status: 404 }).title, 'Portfolio not found | CodeFolio');
});

test('Helmet server rendering replaces old metadata exactly once and escapes hostile text', () => {
  const metadata = portfolioMetadata({
    username: 'avery',
    profile: { name: '</title><script>alert(1)</script>', bio: '\"/><script>alert(2)</script>&' },
  });
  const document = withDocumentMetadata(html, metadata);
  assert.equal((document.match(/<title\b/g) || []).length, 1);
  assert.equal((document.match(/name="description"/g) || []).length, 1);
  assert.equal((document.match(/name="robots"/g) || []).length, 1);
  assert.ok(!document.includes('<script>'));
  assert.ok(!document.includes('Old description'));
  assert.ok(document.includes('&lt;script&gt;'));
  assert.ok(document.includes('name="theme-color"'));
  assert.equal(withDocumentMetadata(document, metadata), document);
});

test('initial public HTML has independent Helmet metadata for two users, with correct error/private rules', async () => {
  const server = createApp({
    production: true,
    getDatabaseStatus: () => 'connected',
    findPublicUser: async (username) => users.find((user) => user.username === username),
    getFrontendHtml: async () => html,
  }).listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const documents = await Promise.all(
      users.map(async (user) => {
        const response = await fetch(`${base}/${user.username}`);
        assert.equal(response.status, 200);
        const document = await response.text();
        assert.ok(document.includes(`${user.profile.name} | Developer Portfolio`));
        assert.ok(document.includes(`content="${user.profile.bio}"`));
        for (const value of [user.email, user.passwordHash, user._id])
          assert.ok(!document.includes(value));
        assert.equal((document.match(/name="description"/g) || []).length, 1);
        return document;
      }),
    );
    assert.ok(!documents[0].includes(users[1].profile.name));
    assert.ok(!documents[1].includes(users[0].profile.name));
    const missing = await fetch(`${base}/missing-user`);
    assert.equal(missing.status, 404);
    assert.match(await missing.text(), /Portfolio not found \| CodeFolio/);
    for (const path of ['/dashboard', '/login', '/register']) {
      const response = await fetch(base + path);
      assert.match(await response.text(), /name="robots" content="noindex, nofollow"/);
    }
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
