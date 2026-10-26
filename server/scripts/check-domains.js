import assert from 'node:assert/strict';
import { User } from '../models/User.js';
import { changeAccountTier } from '../plans/changeTier.js';

export async function checkDomains({ base, ids, usernames, password }) {
  const cookies = [];
  const request = async (index, path, method = 'GET', body) => {
    const response = await fetch(base + path, {
      method,
      redirect: 'manual',
      headers: {
        'Content-Type': 'application/json',
        'X-Codefolio-Request': '1',
        ...(cookies[index] ? { Cookie: cookies[index] } : {}),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      signal: AbortSignal.timeout(12000),
    });
    const text = await response.text();
    return {
      response,
      body: response.headers.get('content-type')?.includes('application/json')
        ? JSON.parse(text)
        : text,
    };
  };
  // This helper uses autoIndex:false; add the declared unique index explicitly.
  await User.collection.createIndex(
    { customDomain: 1 },
    { unique: true, partialFilterExpression: { customDomain: { $type: 'string' } } },
  );
  for (let i = 0; i < 2; i++) {
    const login = await request(i, '/api/auth/login', 'POST', {
      email: `${usernames[i]}@example.invalid`,
      password,
    });
    assert.equal(login.response.status, 200);
    cookies[i] = login.response.headers.get('set-cookie').split(';')[0];
  }
  const path = '/api/pro/domain';
  assert.equal((await request(-1, path)).response.status, 401);
  for (const method of ['GET', 'PUT', 'DELETE'])
    assert.equal(
      (
        await request(
          0,
          path,
          method,
          method === 'GET'
            ? undefined
            : { version: 0, ...(method === 'PUT' ? { domain: 'free.example.com' } : {}) },
        )
      ).response.status,
      403,
    );
  const before = await User.findById(ids[1]).select('+email +passwordHash').lean();
  const initial = await request(1, path);
  assert.equal(initial.body.domain, null);
  assert.equal(initial.response.headers.get('cache-control'), 'no-store');
  for (const body of [
    { domain: 'https://evil.com', version: initial.body.version },
    { domain: 'safe.example.com', version: initial.body.version, userId: String(ids[0]) },
    { domain: 'safe.example.com', version: initial.body.version, tier: 'pro' },
  ])
    assert.equal((await request(1, path, 'PUT', body)).response.status, 400);
  assert.equal((await request(1, `${path}?userId=${ids[0]}`)).response.status, 400);
  const domain = `${usernames[1]}.example.com`;
  const saved = await request(1, path, 'PUT', {
    domain: ` ${domain.toUpperCase()} `,
    version: initial.body.version,
  });
  assert.equal(saved.response.status, 200);
  assert.equal(saved.body.domain, domain);
  assert.equal(saved.body.version, initial.body.version + 1);
  assert.deepEqual((await request(1, path)).body, saved.body);
  const redirect = await request(-1, saved.body.redirectPath);
  assert.equal(redirect.response.status, 302);
  assert.equal(redirect.response.headers.get('location'), `/${usernames[1]}`);
  assert.equal((await request(-1, `/${usernames[1]}`)).response.status, 200);
  const publicRead = await request(-1, `/api/portfolios/${usernames[1]}`);
  assert.equal(Object.hasOwn(publicRead.body.portfolio, 'customDomain'), false);
  assert.equal(
    (await request(1, path, 'PUT', { domain, version: initial.body.version })).response.status,
    409,
  );
  assert.equal(
    (await request(1, path, 'DELETE', { version: initial.body.version })).response.status,
    409,
  );
  const after = await User.findById(ids[1]).select('+email +passwordHash').lean();
  for (const key of [
    'username',
    'email',
    'passwordHash',
    'tier',
    'templateId',
    'profile',
    'projects',
    'skills',
  ])
    assert.deepEqual(after[key], before[key]);
  assert.equal((await User.findById(ids[0]).lean()).customDomain, undefined);
  console.log(
    'PASS: Pro-only owned writes, strict validation, persistence, privacy, stale saves/removal and the anonymous redirect work against Atlas.',
  );

  await changeAccountTier(usernames[0], 'pro', { apply: true });
  const peer = await request(0, path);
  const taken = await request(0, path, 'PUT', { domain, version: peer.body.version });
  assert.equal(taken.response.status, 409);
  assert.equal(taken.body.error.code, 'DOMAIN_IN_USE');
  // Two accounts competing for one unassigned domain: the unique index must decide.
  const racingDomain = `race-${usernames[0]}.example.com`;
  const b = await request(1, path);
  const race = await Promise.all([
    request(0, path, 'PUT', { domain: racingDomain, version: peer.body.version }),
    request(1, path, 'PUT', { domain: racingDomain, version: b.body.version }),
  ]);
  assert.deepEqual(race.map((result) => result.response.status).sort(), [200, 409]);
  assert.equal(await User.countDocuments({ _id: { $in: ids }, customDomain: racingDomain }), 1);
  // Restore B's mapping for downgrade checks and leave A Free for browser review.
  for (let i = 0; i < 2; i++) {
    const current = await request(i, path);
    assert.equal(
      (await request(i, path, 'DELETE', { version: current.body.version })).response.status,
      200,
    );
  }
  assert.equal((await request(-1, saved.body.redirectPath)).response.status, 404);
  const ready = await request(1, path);
  assert.equal(
    (await request(1, path, 'PUT', { domain, version: ready.body.version })).response.status,
    200,
  );
  await changeAccountTier(usernames[1], 'free', { apply: true });
  assert.equal((await request(1, path)).response.status, 403);
  assert.equal((await request(-1, saved.body.redirectPath)).response.status, 404);
  await changeAccountTier(usernames[1], 'pro', { apply: true });
  assert.equal((await request(-1, saved.body.redirectPath)).response.status, 302);
  const active = await request(1, path);
  const removed = await request(1, path, 'DELETE', { version: active.body.version });
  assert.equal(removed.response.status, 200);
  assert.equal(removed.body.domain, null);
  assert.equal(removed.body.redirectPath, null);
  assert.equal((await request(-1, saved.body.redirectPath)).response.status, 404);
  // Removal releases uniqueness, so another Pro account may claim the hostname.
  const a = await request(0, path);
  assert.equal(
    (await request(0, path, 'PUT', { domain, version: a.body.version })).response.status,
    200,
  );
  assert.equal(
    (await request(-1, saved.body.redirectPath)).response.headers.get('location'),
    `/${usernames[0]}`,
  );
  const claimed = await request(0, path);
  await request(0, path, 'DELETE', { version: claimed.body.version });
  await changeAccountTier(usernames[0], 'free', { apply: true });
  console.log(
    'PASS: Duplicate/concurrent claims, removal, released-domain reuse and same-session downgrade/reinstatement enforce database tier and uniqueness.',
  );
}
