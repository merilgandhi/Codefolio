import test from 'node:test';
import assert from 'node:assert/strict';
import { User } from '../models/User.js';
import { toPublicPortfolio } from '../serializers/publicPortfolio.js';
import { isWebUrl } from '../validation/portfolio.js';
import { RESERVED_USERNAMES } from '../../shared/portfolio.js';

function validUser(overrides = {}) {
  return {
    username: 'alex-dev',
    email: 'alex@example.com',
    passwordHash: 'x'.repeat(64), // Model fixture only; not a password hashing implementation.
    profile: { name: 'Alex Morgan' },
    ...overrides,
  };
}

test('a full professional profile supports every required field and stable project IDs', async () => {
  const user = new User(
    validUser({
      templateId: 'cyberpunk',
      tier: 'pro',
      profile: {
        name: 'Alex Morgan',
        bio: 'I build developer tools.',
        socialLinks: [{ label: 'GitHub', url: 'https://github.com/alex' }],
        resumeUrl: 'https://example.com/resume.pdf',
      },
      projects: [
        {
          title: 'CodeFolio',
          description: 'A developer portfolio builder.',
          techStack: ['React', 'Node.js'],
          repoLink: 'https://github.com/alex/codefolio',
          liveLink: 'https://example.com',
          screenshot: 'https://example.com/project.webp',
        },
      ],
      skills: { frontend: ['React'], backend: ['Express'], devops: ['Docker'] },
    }),
  );
  await user.validate();
  const restored = new User(user.toObject());
  await restored.validate();
  assert.equal(String(restored.projects[0]._id), String(user.projects[0]._id));
  assert.deepEqual(toPublicPortfolio(restored), toPublicPortfolio(user));
  assert.equal(user.templateId, 'cyberpunk');
});

test('new accounts normalize identifiers and have usable empty sections', async () => {
  const user = new User(validUser({ username: '  Alex-Dev  ', email: ' ALEX@EXAMPLE.COM ' }));
  await user.validate();
  assert.equal(user.username, 'alex-dev');
  assert.equal(user.email, 'alex@example.com');
  assert.equal(user.tier, 'free');
  assert.equal(user.templateId, 'bento');
  assert.deepEqual(toPublicPortfolio(user).skills, { frontend: [], backend: [], devops: [] });
  assert.deepEqual(toPublicPortfolio(user).projects, []);
});

test('reject missing account fields, invalid email and blank profile name', async () => {
  for (const overrides of [
    { email: '' },
    { email: 'not-an-email' },
    { passwordHash: '' },
    { passwordHash: 'plaintext' },
    { profile: undefined },
    { profile: { name: '   ' } },
  ]) {
    await assert.rejects(new User(validUser(overrides)).validate(), { name: 'ValidationError' });
  }
});

test('reject invalid and reserved usernames, including case-normalized names', async () => {
  for (const username of [
    ...RESERVED_USERNAMES,
    'DASHBOARD',
    'ab',
    '-alex',
    'alex-',
    'alex.dev',
    'a/b',
    'x'.repeat(31),
  ]) {
    await assert.rejects(new User(validUser({ username })).validate(), { name: 'ValidationError' });
  }
});

test('link validation blocks executable URLs, credentials, relative links and malformed URLs', () => {
  for (const url of [
    'javascript:alert(1)',
    'data:text/html,hello',
    '//evil.example',
    '/resume.pdf',
    'https://user:pass@example.com',
    'https://',
    'https://example.com/a b',
    'https:\\example.com',
  ]) {
    assert.equal(isWebUrl(url), false, url);
  }
  for (const url of [
    '',
    'https://github.com/alex',
    'http://localhost:5174/alex',
    'https://example.com/resume.pdf?download=1',
  ]) {
    assert.equal(isWebUrl(url), true, url);
  }
});

test('URL validation applies to social, resume and every project link', async () => {
  const cases = [
    { profile: { name: 'Alex', resumeUrl: 'javascript:alert(1)' } },
    { profile: { name: 'Alex', socialLinks: [{ label: 'GitHub', url: '' }] } },
    { profile: { name: 'Alex', socialLinks: [{ label: '', url: 'https://github.com' }] } },
    ...['repoLink', 'liveLink', 'screenshot'].map((field) => ({
      projects: [{ title: 'App', description: 'Description', [field]: 'javascript:alert(1)' }],
    })),
  ];
  for (const overrides of cases)
    await assert.rejects(new User(validUser(overrides)).validate(), { name: 'ValidationError' });
});

test('project fields, enums, tag arrays, lengths and collection limits are validated', async () => {
  const project = { title: 'App', description: 'Description' };
  const cases = [
    { templateId: 'unknown' },
    { tier: 'admin' },
    { skills: null },
    { profile: { name: 'x'.repeat(101) } },
    { profile: { name: 'Alex', bio: 'x'.repeat(2001) } },
    { projects: [{ description: 'No title' }] },
    { projects: [{ title: 'No description' }] },
    { projects: [{ ...project, techStack: 'React' }] },
    { projects: [{ ...project, techStack: ['React', 'react'] }] },
    { projects: Array.from({ length: 51 }, () => project) },
    { skills: { frontend: ['   '] } },
    { skills: { backend: ['x'.repeat(51)] } },
    { skills: { devops: Array.from({ length: 41 }, (_, i) => `tool-${i}`) } },
    {
      profile: {
        name: 'Alex',
        socialLinks: Array.from({ length: 11 }, () => ({
          label: 'GitHub',
          url: 'https://github.com',
        })),
      },
    },
  ];
  for (const overrides of cases)
    await assert.rejects(new User(validUser(overrides)).validate(), { name: 'ValidationError' });
});

test('unknown fields are rejected rather than becoming stored account data', () => {
  assert.throws(() => new User(validUser({ role: 'admin' })), { name: 'StrictModeError' });
});

test('public serializer excludes private and future fields for documents and lean objects', () => {
  const user = new User(validUser());
  const lean = { ...user.toObject(), futureSecret: 'never expose', resetToken: 'private' };
  for (const source of [user, lean]) {
    const result = toPublicPortfolio(source);
    assert.deepEqual(
      Object.keys(result).sort(),
      ['isPro', 'profile', 'projects', 'skills', 'templateId', 'username'].sort(),
    );
    for (const forbidden of [
      'email',
      'passwordHash',
      'resetToken',
      'futureSecret',
      '_id',
      '__v',
      'tier',
    ]) {
      assert.equal(Object.hasOwn(result, forbidden), false);
    }
  }
  assert.equal(Object.hasOwn(user.toJSON(), 'email'), false);
  assert.equal(Object.hasOwn(user.toJSON(), 'passwordHash'), false);
});

test('public data arrays are independent copies, not mutable model references', () => {
  const user = new User(
    validUser({
      skills: { frontend: ['React'] },
      projects: [{ title: 'App', description: 'Description', techStack: ['Node.js'] }],
    }),
  );
  const result = toPublicPortfolio(user);
  result.skills.frontend.push('Changed');
  result.projects[0].techStack.push('Changed');
  assert.deepEqual([...user.skills.frontend], ['React']);
  assert.deepEqual([...user.projects[0].techStack], ['Node.js']);
});
