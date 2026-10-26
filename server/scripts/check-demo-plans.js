import assert from 'node:assert/strict';
import { User } from '../models/User.js';

export async function checkDemoPlans({ base, ids, usernames, request }) {
  const path = '/api/plan';
  const snapshot = await User.findById(ids[0]).select('+email +passwordHash').lean();
  const peer = await User.findById(ids[1]).select('+email +passwordHash').lean();
  const initial = (await request(0, path)).body;
  assert.equal(initial.mode, 'demo');
  assert.equal(initial.plan.id, 'free');
  for (const body of [
    { planId: 'PRO', version: initial.version },
    { planId: 'pro', version: initial.version, userId: String(ids[1]) },
    { tier: 'pro', version: initial.version },
  ])
    assert.equal((await request(0, path, { method: 'PUT', body })).response.status, 400);
  assert.equal(
    (
      await request(0, path + '?username=' + usernames[1], {
        method: 'PUT',
        body: { planId: 'pro', version: initial.version },
      })
    ).response.status,
    400,
  );
  assert.equal(
    (await request(0, path, { method: 'POST', body: { planId: 'pro', version: initial.version } }))
      .response.status,
    405,
  );
  const unsafe = await request(0, path, {
    method: 'PUT',
    body: { planId: 'pro', version: initial.version },
    extra: { Origin: 'https://untrusted.example' },
  });
  assert.equal(unsafe.response.status, 403);
  const upgrade = await request(0, path, {
    method: 'PUT',
    body: { planId: 'pro', version: initial.version },
  });
  assert.equal(upgrade.response.status, 200);
  assert.equal(upgrade.body.mode, 'demo');
  assert.equal(upgrade.body.plan.id, 'pro');
  assert.equal(upgrade.body.version, initial.version + 1);
  assert.equal(upgrade.response.headers.get('cache-control'), 'no-store');
  assert.equal((await request(0, '/api/auth/me')).body.user.tier, 'pro');
  assert.equal((await request(0, '/api/pro/access')).response.status, 200);
  assert.equal((await request(0, `/api/portfolios/${usernames[0]}`)).body.portfolio.isPro, true);
  assert.deepEqual((await request(0, path)).body, upgrade.body);
  assert.equal(
    (await request(0, path, { method: 'PUT', body: { planId: 'free', version: initial.version } }))
      .response.status,
    409,
  );
  // Existing editor drafts must not silently overwrite a changed account version.
  assert.equal(
    (
      await request(0, '/api/template', {
        method: 'PUT',
        body: { templateId: 'bento', version: initial.version },
      })
    ).response.status,
    409,
  );
  const domain = `${usernames[0]}.example.com`;
  await User.collection.createIndex(
    { customDomain: 1 },
    { unique: true, partialFilterExpression: { customDomain: { $type: 'string' } } },
  );
  const savedDomain = await request(0, '/api/pro/domain', {
    method: 'PUT',
    body: { domain, version: upgrade.body.version },
  });
  assert.equal(savedDomain.response.status, 200);
  const redirect = async (status) => {
    const response = await fetch(base + savedDomain.body.redirectPath, {
      redirect: 'manual',
      signal: AbortSignal.timeout(10000),
    });
    assert.equal(response.status, status);
    if (status === 302) assert.equal(response.headers.get('location'), `/${usernames[0]}`);
    await response.text();
  };
  await redirect(302);
  const downgrade = await request(0, path, {
    method: 'PUT',
    body: { planId: 'free', version: savedDomain.body.version },
  });
  assert.equal(downgrade.response.status, 200);
  assert.equal(downgrade.body.plan.id, 'free');
  assert.equal((await request(0, '/api/pro/access')).response.status, 403);
  assert.equal((await request(0, '/api/pro/domain')).response.status, 403);
  assert.equal((await request(0, `/api/portfolios/${usernames[0]}`)).body.portfolio.isPro, false);
  assert.equal((await User.findById(ids[0]).lean()).customDomain, domain);
  await redirect(404);
  const restored = await request(0, path, {
    method: 'PUT',
    body: { planId: 'pro', version: downgrade.body.version },
  });
  assert.equal(restored.response.status, 200);
  await redirect(302);
  await request(0, '/api/pro/domain', {
    method: 'DELETE',
    body: { version: restored.body.version },
  });
  const latest = (await request(0, path)).body;
  const racing = await Promise.all(
    ['free', 'pro'].map((planId) =>
      request(0, path, { method: 'PUT', body: { planId, version: latest.version } }),
    ),
  );
  assert.deepEqual(racing.map((result) => result.response.status).sort(), [200, 409]);
  const current = (await request(0, path)).body;
  if (current.plan.id !== 'free')
    assert.equal(
      (
        await request(0, path, {
          method: 'PUT',
          body: { planId: 'free', version: current.version },
        })
      ).response.status,
      200,
    );
  const after = await User.findById(ids[0]).select('+email +passwordHash').lean();
  for (const key of [
    'username',
    'email',
    'passwordHash',
    'profile',
    'projects',
    'skills',
    'templateId',
    'createdAt',
  ])
    assert.deepEqual(after[key], snapshot[key]);
  assert.deepEqual(await User.findById(ids[1]).select('+email +passwordHash').lean(), peer);
  console.log(
    'PASS: Demo selection persists, upgrades/downgrades actual badge/domain access, preserves portfolio/peer data and rejects stale, concurrent, cross-origin and forged-account writes.',
  );
}
