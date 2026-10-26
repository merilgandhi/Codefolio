import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeDomain, validateDomainChange } from '../../shared/domains.js';
import { createApp } from '../app.js';
import { User } from '../models/User.js';
import { toPublicPortfolio } from '../serializers/publicPortfolio.js';

async function serverFor(options, run) {
  const server = createApp(options).listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  try {
    await run(`http://127.0.0.1:${server.address().port}`);
  } finally {
    await new Promise((resolve) => {
      server.close(resolve);
      server.closeAllConnections();
    });
  }
}
test('domain validation accepts hostnames and rejects URLs, credentials, IPs, local names and control characters', () => {
  for (const [input, expected] of [
    ['  Work.Example.COM ', 'work.example.com'],
    ['xn--bcher-kva.de', 'xn--bcher-kva.de'],
    ['a.co', 'a.co'],
    [`${'a'.repeat(63)}.com`, `${'a'.repeat(63)}.com`],
  ])
    assert.equal(normalizeDomain(input), expected);
  for (const value of [
    null,
    {},
    ['example.com'],
    '',
    'localhost',
    'app.local',
    'app.internal',
    '127.0.0.1',
    '[::1]',
    '2130706433',
    'https://example.com',
    '//evil.com',
    'user@example.com',
    'example.com:80',
    'example.com/path',
    'example.com?next=//evil.com',
    '*.example.com',
    'example.com.',
    '-bad.com',
    'bad-.com',
    'a..com',
    'a.c',
    'example.123',
    'x.com\r\nLocation: https://evil.com',
    'exämple.com',
    `${'x'.repeat(64)}.com`,
    'a.'.repeat(126) + 'com',
  ])
    assert.equal(normalizeDomain(value), null, String(value));
});
test('domain writes accept only domain/version or a version-only removal', () => {
  assert.deepEqual(validateDomainChange({ domain: ' EXAMPLE.COM ', version: 0 }), {
    domain: 'example.com',
    version: 0,
    fields: {},
  });
  assert.deepEqual(validateDomainChange({ version: 1 }, true), {
    domain: null,
    version: 1,
    fields: {},
  });
  for (const input of [
    null,
    [],
    { domain: 'x.com', version: -1 },
    { domain: 'x.com', version: '1' },
    { domain: 'x.com', version: 1, userId: 'other' },
    { domain: 'x.com', version: 1, tier: 'pro' },
    { version: 0 },
  ])
    assert.ok(Object.keys(validateDomainChange(input).fields).length);
  assert.ok(validateDomainChange({ domain: 'x.com', version: 1 }, true).fields.root);
});
test('domain storage is canonical and omitted from the public serializer', async () => {
  const user = new User({
    username: 'domain-owner',
    email: 'owner@example.invalid',
    passwordHash: 'x'.repeat(64),
    profile: { name: 'Domain Owner' },
    customDomain: 'owner.example.com',
  });
  await user.validate();
  assert.equal(Object.hasOwn(toPublicPortfolio(user.toObject()), 'customDomain'), false);
  user.customDomain = 'https://unsafe.com';
  await assert.rejects(user.validate());
});
test('domain settings require a session and connected database; unsafe writes fail first', async () => {
  await serverFor({ getDatabaseStatus: () => 'connected' }, async (base) => {
    assert.equal((await fetch(base + '/api/pro/domain')).status, 401);
    assert.equal(
      (
        await fetch(base + '/api/pro/domain', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ domain: 'x.com', version: 0 }),
        })
      ).status,
      403,
    );
  });
  await serverFor({ getDatabaseStatus: () => 'disconnected' }, async (base) =>
    assert.equal((await fetch(base + '/api/pro/domain')).status, 503),
  );
});
test('public simulation redirects only to an app-owned Pro username and ignores hostile Host headers', async () => {
  let lookedUp;
  await serverFor(
    {
      getDatabaseStatus: () => 'connected',
      findDomainOwner: async (domain) => {
        lookedUp = domain;
        return { username: 'domain-owner', tier: 'pro' };
      },
    },
    async (base) => {
      const response = await fetch(base + '/api/domains/WORK.EXAMPLE.COM', {
        redirect: 'manual',
        headers: {
          Host: 'evil.example',
          'X-Forwarded-Host': 'evil.example',
          'X-Forwarded-Proto': 'https',
        },
      });
      assert.equal(response.status, 302);
      assert.equal(lookedUp, 'work.example.com');
      assert.equal(response.headers.get('location'), '/domain-owner');
      assert.equal(response.headers.get('cache-control'), 'no-store');
      assert.equal(response.headers.get('x-robots-tag'), 'noindex, nofollow');
      assert.equal(
        (
          await fetch(base + '/api/domains/example.com?url=https://evil.com', {
            redirect: 'manual',
          })
        ).status,
        400,
      );
      assert.equal(
        (
          await fetch(base + '/api/domains/' + encodeURIComponent('//evil.com'), {
            redirect: 'manual',
          })
        ).status,
        400,
      );
    },
  );
});
test('missing, downgraded and malformed owners never redirect; database failures return sanitized 503', async () => {
  for (const owner of [
    null,
    { tier: 'free', username: 'owner' },
    { tier: 'pro', username: '//evil.com' },
  ])
    await serverFor(
      { getDatabaseStatus: () => 'connected', findDomainOwner: async () => owner },
      async (base) =>
        assert.equal(
          (await fetch(base + '/api/domains/example.com', { redirect: 'manual' })).status,
          404,
        ),
    );
  for (const getDatabaseStatus of [() => 'connected', () => 'disconnected'])
    await serverFor(
      {
        getDatabaseStatus,
        findDomainOwner: async () => {
          throw new Error('private database detail');
        },
      },
      async (base) => {
        const response = await fetch(base + '/api/domains/example.com');
        assert.equal(response.status, 503);
        assert.equal((await response.text()).includes('private database'), false);
      },
    );
});
