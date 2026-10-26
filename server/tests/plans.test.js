import test from 'node:test';
import assert from 'node:assert/strict';
import {
  accountPlan,
  isProTier,
  normalizeTier,
  validatePlanSelection,
} from '../../shared/plans.js';
import { requirePro } from '../middleware/requirePro.js';
import { changeAccountTier } from '../plans/changeTier.js';
import { createApp } from '../app.js';
import { accountResponse } from '../auth/sessions.js';
import { toPublicPortfolio } from '../serializers/publicPortfolio.js';
import { User } from '../models/User.js';

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
test('only the exact stored pro tier enables Pro capabilities; invalid or missing tiers stay Free', () => {
  for (const tier of [
    undefined,
    null,
    '',
    'PRO',
    'admin',
    'constructor',
    '__proto__',
    true,
    1,
    {},
    ['pro'],
    'free',
  ]) {
    assert.equal(isProTier(tier), false);
    assert.equal(normalizeTier(tier), 'free');
    assert.deepEqual(accountPlan(tier), {
      id: 'free',
      label: 'Free',
      features: { proBadge: false, customDomain: false },
    });
  }
  assert.deepEqual(accountPlan('pro'), {
    id: 'pro',
    label: 'Pro',
    features: { proBadge: true, customDomain: true },
  });
});
test('account and public serializers agree about the stored plan without exposing the private tier field', async () => {
  const user = new User({
    username: 'plan-owner',
    email: 'private@example.invalid',
    passwordHash: 'x'.repeat(64),
    profile: { name: 'Owner' },
  });
  await user.validate();
  assert.equal(user.tier, 'free');
  for (const tier of ['free', 'pro', undefined, 'unknown', true]) {
    const source = { ...user.toObject(), tier };
    assert.equal(accountResponse(source).tier, tier === 'pro' ? 'pro' : 'free');
    const publicData = toPublicPortfolio(source);
    assert.equal(publicData.isPro, tier === 'pro');
    assert.equal(Object.hasOwn(publicData, 'tier'), false);
    assert.equal(Object.hasOwn(publicData, 'email'), false);
  }
});
test('premium guard rejects client-supplied flags and permits only the authenticated stored Pro tier', () => {
  for (const tier of ['free', undefined, 'PRO', true, { pro: true }]) {
    let status,
      called = false;
    const response = {
      status(value) {
        status = value;
        return this;
      },
      json(value) {
        return value;
      },
    };
    const body = requirePro(
      {
        account: { tier },
        body: { tier: 'pro', isPro: true },
        query: { tier: 'pro' },
        headers: { 'x-plan': 'pro' },
      },
      response,
      () => {
        called = true;
      },
    );
    assert.equal(status, 403);
    assert.equal(body.error.code, 'PRO_REQUIRED');
    assert.equal(called, false);
  }
  let called = false;
  requirePro({ account: { tier: 'pro' } }, {}, () => {
    called = true;
  });
  assert.equal(called, true);
  let status;
  requirePro(
    {},
    {
      status(value) {
        status = value;
        return this;
      },
      json() {},
    },
    () => assert.fail('Anonymous access'),
  );
  assert.equal(status, 401);
});
test('plan APIs require a session and database, never cache account access and reject unsafe writes', async () => {
  await serverFor({ getDatabaseStatus: () => 'connected' }, async (base) => {
    for (const path of ['/api/plan', '/api/pro/access']) {
      const response = await fetch(base + path);
      assert.equal(response.status, 401);
      assert.equal(response.headers.get('cache-control'), 'no-store');
      const unsafe = await fetch(base + path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier: 'pro' }),
      });
      assert.equal(unsafe.status, 403);
      if (path === '/api/plan') {
        const anonymousWrite = await fetch(base + path, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'X-Codefolio-Request': '1' },
          body: JSON.stringify({ planId: 'pro', version: 0 }),
        });
        assert.equal(anonymousWrite.status, 401);
      }
    }
  });
  await serverFor({ getDatabaseStatus: () => 'disconnected' }, async (base) => {
    for (const path of ['/api/plan', '/api/pro/access'])
      assert.equal((await fetch(base + path)).status, 503);
  });
});
test('demo plan selection accepts only exact Free/Pro IDs and saved versions without ownership or account overrides', () => {
  for (const planId of ['free', 'pro'])
    assert.deepEqual(validatePlanSelection({ planId, version: 0 }), { planId, version: 0 });
  for (const input of [
    null,
    [],
    {},
    { tier: 'pro', version: 0 },
    { planId: 'PRO', version: 0 },
    { planId: 'admin', version: 0 },
    { planId: ['pro'], version: 0 },
    { planId: 'pro', version: '0' },
    { planId: 'pro', version: -1 },
    { planId: 'pro', version: 1.1 },
    { planId: 'pro', version: 0, userId: 'peer' },
    { planId: 'pro', version: 0, email: 'peer@example.com' },
    { planId: 'pro', version: 0, profile: {} },
  ])
    assert.ok(validatePlanSelection(input).error);
});
test('registration rejects Pro, ownership and template overrides before any database access', async () => {
  await serverFor({ getDatabaseStatus: () => 'connected' }, async (base) => {
    for (const key of ['tier', 'isPro', 'userId', 'templateId', 'passwordHash']) {
      const response = await fetch(base + '/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Codefolio-Request': '1' },
        body: JSON.stringify({
          name: 'Visitor',
          username: 'plan-visitor',
          email: 'visitor@example.invalid',
          password: 'Temporary fixture password 2026',
          [key]: 'pro',
        }),
      });
      assert.equal(response.status, 400);
      assert.equal((await response.json()).error.code, 'VALIDATION_ERROR');
    }
  });
});
test('operator tier changes reject malformed usernames and unsupported plans before opening the database', async () => {
  for (const [username, tier] of [
    ['admin', 'pro'],
    ['Valid-Name', 'pro'],
    ['valid-name', 'PRO'],
    ['valid-name', 'admin'],
    ['../account', 'pro'],
    ['valid-name', { $set: 'pro' }],
  ])
    await assert.rejects(() => changeAccountTier(username, tier, { apply: true }), {
      name: 'TypeError',
    });
});
