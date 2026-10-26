import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../app.js';

async function withServer(run) {
  const server = createApp({ getDatabaseStatus: () => 'not_configured' }).listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  try {
    await run(`http://127.0.0.1:${server.address().port}`);
  } finally {
    await new Promise((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
}

test('health reports an unconfigured database without claiming persistence is ready', () =>
  withServer(async (base) => {
    const response = await fetch(`${base}/api/health`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      status: 'ok',
      service: 'codefolio-api',
      database: 'not_configured',
    });
  }));

test('unknown API routes return JSON instead of the frontend', () =>
  withServer(async (base) => {
    const response = await fetch(`${base}/api/missing`);
    assert.equal(response.status, 404);
    assert.equal((await response.json()).error.code, 'NOT_FOUND');
  }));

test('malformed JSON returns a safe validation error', () =>
  withServer(async (base) => {
    const response = await fetch(`${base}/api/missing`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{',
    });
    assert.equal(response.status, 400);
    assert.equal((await response.json()).error.message, 'Invalid JSON body.');
  }));
