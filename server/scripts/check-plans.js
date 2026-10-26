import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { User } from '../models/User.js';
import { checkDemoPlans } from './check-demo-plans.js';

export async function checkPlans({ base, ids, usernames, password }) {
  const headers = { 'Content-Type': 'application/json', 'X-Codefolio-Request': '1' };
  const cookies = [];
  const request = async (index, path, { method = 'GET', body, extra = {} } = {}) => {
    const response = await fetch(base + path, {
      method,
      headers: { ...headers, ...(cookies[index] ? { Cookie: cookies[index] } : {}), ...extra },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      signal: AbortSignal.timeout(12000),
    });
    return { response, body: await response.json() };
  };
  for (let i = 0; i < ids.length; i++) {
    const login = await request(i, '/api/auth/login', {
      method: 'POST',
      body: { email: `${usernames[i]}@example.invalid`, password },
    });
    assert.equal(login.response.status, 200);
    cookies[i] = login.response.headers.get('set-cookie').split(';')[0];
    const plan = await request(i, '/api/plan');
    assert.equal(plan.response.status, 200);
    assert.equal(plan.body.plan.id, i ? 'pro' : 'free');
    assert.equal(plan.response.headers.get('cache-control'), 'no-store');
    const access = await request(i, '/api/pro/access');
    assert.equal(access.response.status, i ? 200 : 403);
    const publicRead = await request(i, `/api/portfolios/${usernames[i]}`);
    assert.equal(publicRead.body.portfolio.isPro, i === 1);
    assert.equal(Object.hasOwn(publicRead.body.portfolio, 'tier'), false);
    assert.equal(
      (
        await request(i, '/api/plan', {
          method: 'PUT',
          body: { tier: 'pro', userId: String(ids[1 - i]) },
        })
      ).response.status,
      400,
    );
  }
  assert.equal(
    (await request(0, '/api/pro/access', { extra: { 'X-Plan': 'pro', 'X-Is-Pro': 'true' } }))
      .response.status,
    403,
  );
  assert.equal((await request(0, `/api/plan?userId=${ids[1]}&tier=pro`)).response.status, 400);
  assert.equal((await request(1, '/api/pro/access?tier=pro')).response.status, 400);
  const noCookie = await fetch(base + '/api/pro/access', {
    headers: { Cookie: 'codefolio_polish_session=' + 'a'.repeat(64) },
    signal: AbortSignal.timeout(12000),
  });
  assert.equal(noCookie.status, 401);
  await noCookie.text();
  console.log(
    'PASS: Free/Pro sessions, public flags, invalid sessions and rejected selectors/plan overrides behave correctly.',
  );
  const snapshot = await User.findById(ids[0]).select('+email +passwordHash').lean();
  const tierCommand = (tier, apply) => {
    const result = spawnSync(
      process.execPath,
      [
        fileURLToPath(new URL('./manage-tier.js', import.meta.url)),
        usernames[0],
        tier,
        ...(apply ? ['--apply'] : []),
      ],
      { encoding: 'utf8', timeout: 20000 },
    );
    assert.equal(result.status, 0, 'Operator command should succeed without logging credentials.');
  };
  tierCommand('pro', false);
  assert.deepEqual(await User.findById(ids[0]).select('+email +passwordHash').lean(), snapshot);
  tierCommand('pro', true);
  assert.equal((await request(0, '/api/pro/access')).response.status, 200);
  assert.equal((await request(0, '/api/auth/me')).body.user.tier, 'pro');
  assert.equal((await request(0, `/api/portfolios/${usernames[0]}`)).body.portfolio.isPro, true);
  assert.equal(
    (
      await request(0, '/api/template', {
        method: 'PUT',
        body: { templateId: 'bento', version: snapshot.__v },
      })
    ).response.status,
    409,
  );
  tierCommand('free', true);
  assert.equal((await request(0, '/api/pro/access')).response.status, 403);
  assert.equal((await request(0, '/api/plan')).body.plan.id, 'free');
  assert.equal((await request(0, `/api/portfolios/${usernames[0]}`)).body.portfolio.isPro, false);
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
  assert.equal(after.__v, snapshot.__v + 2);
  assert.equal((await User.findById(ids[1])).tier, 'pro');
  console.log(
    'PASS: Real operator dry-run/upgrade/downgrade preserve content and peer identity, increment the edit version and immediately change access in the same session.',
  );
  await checkDemoPlans({ base, ids, usernames, request });
}
