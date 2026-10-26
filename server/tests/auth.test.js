import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../app.js';
import { hashPassword, validPassword, verifyPassword } from '../auth/passwords.js';
import { cookieOptions, digestToken } from '../auth/sessions.js';

test('password hashes are salted, verifiable and reject wrong passwords or malformed hashes', async () => {
  const password = 'A long test passphrase 2026!';
  const first = await hashPassword(password);
  const second = await hashPassword(password);
  assert.notEqual(first, second);
  assert.equal(first.includes(password), false);
  assert.equal(await verifyPassword(password, first), true);
  assert.equal(await verifyPassword('A different long password!', first), false);
  for (const hash of ['', 'plaintext', 'scrypt$999999999$8$2$bad$bad', null]) {
    assert.equal(await verifyPassword(password, hash), false);
  }
});

test('password input limits reject short, oversized and non-string values without trimming', async () => {
  for (const value of ['short', 'x'.repeat(129), null, {}, ['a long password'], 123]) {
    assert.equal(validPassword(value), false);
    await assert.rejects(hashPassword(value), { name: 'TypeError' });
  }
  const password = '  space matters  ';
  const hash = await hashPassword(password);
  assert.equal(await verifyPassword(password, hash), true);
  assert.equal(await verifyPassword(password.trim(), hash), false);
});

test('session cookie is HTTP-only, same-site and secure in production; token storage is one-way', () => {
  assert.deepEqual(cookieOptions(true), {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
  });
  assert.equal(cookieOptions(false).secure, false);
  const token = 'ab'.repeat(32);
  assert.match(digestToken(token), /^[a-f0-9]{64}$/);
  assert.notEqual(digestToken(token), token);
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

const jsonHeaders = { 'Content-Type': 'application/json', 'X-Codefolio-Request': '1' };

test('authentication rejects cross-site, unmarked and non-JSON writes before database access', () =>
  withServer({}, async (base) => {
    const cases = [
      [{ 'Content-Type': 'application/json' }, 403],
      [{ ...jsonHeaders, Origin: 'https://untrusted.example' }, 403],
      [{ ...jsonHeaders, 'Sec-Fetch-Site': 'cross-site' }, 403],
      [{ 'Content-Type': 'text/plain', 'X-Codefolio-Request': '1' }, 415],
    ];
    for (const [headers, status] of cases) {
      const response = await fetch(`${base}/api/auth/login`, {
        method: 'POST',
        headers,
        body: '{}',
      });
      assert.equal(response.status, status);
      assert.equal(response.headers.get('cache-control'), 'no-store');
    }
  }));

test('unconfigured database fails promptly and limits repeated authentication attempts', () =>
  withServer({}, async (base) => {
    for (let index = 0; index < 21; index++) {
      const response = await fetch(`${base}/api/auth/login`, {
        method: 'POST',
        headers: jsonHeaders,
        body: '{}',
      });
      assert.equal(response.status, index < 20 ? 503 : 429);
    }
  }));

test('registration validates input types and required fields before querying MongoDB', () =>
  withServer({ getDatabaseStatus: () => 'connected' }, async (base) => {
    const response = await fetch(`${base}/api/auth/register`, {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify({
        name: {},
        username: 'dashboard',
        email: { $ne: null },
        password: 'short',
      }),
    });
    assert.equal(response.status, 400);
    const body = await response.json();
    assert.deepEqual(Object.keys(body.error.fields).sort(), [
      'email',
      'name',
      'password',
      'username',
    ]);
  }));

test('malformed login input returns the same generic credential error', () =>
  withServer({ getDatabaseStatus: () => 'connected' }, async (base) => {
    for (const input of [
      {},
      { email: { $ne: null }, password: 'long enough password' },
      { email: 'alex@example.com', password: '' },
    ]) {
      const response = await fetch(`${base}/api/auth/login`, {
        method: 'POST',
        headers: jsonHeaders,
        body: JSON.stringify(input),
      });
      assert.equal(response.status, 401);
      assert.equal((await response.json()).error.message, 'Email or password is incorrect.');
    }
  }));
