import test from 'node:test';
import assert from 'node:assert/strict';
import { validateProfile } from '../../shared/profile.js';
import { createApp } from '../app.js';

test('profile input normalizes text and preserves explicit empty optional sections', () => {
  assert.deepEqual(
    validateProfile({
      name: ' Alex ',
      bio: ' Builder ',
      resumeUrl: ' https://example.com/resume.pdf ',
      socialLinks: [{ label: ' GitHub ', url: ' https://github.com/alex ' }],
    }),
    {
      fields: {},
      profile: {
        name: 'Alex',
        bio: 'Builder',
        resumeUrl: 'https://example.com/resume.pdf',
        socialLinks: [{ label: 'GitHub', url: 'https://github.com/alex' }],
      },
    },
  );
  assert.deepEqual(validateProfile({ name: 'Alex' }).profile, {
    name: 'Alex',
    bio: '',
    resumeUrl: '',
    socialLinks: [],
  });
});

test('profile validation rejects wrong types, oversized fields and privileged extra fields', () => {
  for (const profile of [
    null,
    [],
    'profile',
    { name: '' },
    { name: {} },
    { name: 'x'.repeat(101) },
    { name: 'Alex', bio: [] },
    { name: 'Alex', bio: 'x'.repeat(2001) },
    { name: 'Alex', socialLinks: null },
    { name: 'Alex', tier: 'pro' },
  ]) {
    assert.ok(Object.keys(validateProfile(profile).fields).length);
  }
});

test('social-link validation rejects missing labels, unsafe URLs, unknown fields and excess rows', () => {
  for (const link of [
    null,
    {},
    { label: '', url: 'https://example.com' },
    { label: 'GitHub', url: '' },
    { label: 'GitHub', url: 'javascript:alert(1)' },
    { label: 'x'.repeat(41), url: 'https://example.com' },
    { label: 'GitHub', url: 'https://example.com', owner: 'someone-else' },
  ]) {
    assert.ok(Object.keys(validateProfile({ name: 'Alex', socialLinks: [link] }).fields).length);
  }
  assert.ok(
    validateProfile({
      name: 'Alex',
      socialLinks: Array.from({ length: 11 }, () => ({
        label: 'GitHub',
        url: 'https://example.com',
      })),
    }).fields.socialLinks,
  );
  for (const resumeUrl of [
    'javascript:alert(1)',
    '/resume.pdf',
    'https://user:pass@example.com',
    'x'.repeat(2049),
    {},
  ]) {
    assert.ok(validateProfile({ name: 'Alex', resumeUrl }).fields.resumeUrl);
  }
});

async function withServer(options, run) {
  const server = createApp(options).listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  try {
    await run(`http://127.0.0.1:${server.address().port}`);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

test('profile endpoints reject anonymous users and cross-site writes', () =>
  withServer({ getDatabaseStatus: () => 'connected' }, async (base) => {
    assert.equal((await fetch(`${base}/api/profile`)).status, 401);
    for (const [headers, expected] of [
      [{ 'Content-Type': 'application/json' }, 403],
      [
        {
          'Content-Type': 'application/json',
          'X-Codefolio-Request': '1',
          Origin: 'https://untrusted.example',
        },
        403,
      ],
      [{ 'Content-Type': 'text/plain', 'X-Codefolio-Request': '1' }, 415],
      [{ 'Content-Type': 'application/json', 'X-Codefolio-Request': '1' }, 401],
    ]) {
      const response = await fetch(`${base}/api/profile`, { method: 'PUT', headers, body: '{}' });
      assert.equal(response.status, expected);
      assert.equal(response.headers.get('Cache-Control'), 'no-store');
    }
  }));
