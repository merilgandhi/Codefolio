import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../app.js';

test('portfolio preview requires authentication, is never cached, and handles database downtime', async () => {
  for (const [database, expected] of [
    ['connected', 401],
    ['disconnected', 503],
  ]) {
    const server = createApp({ getDatabaseStatus: () => database }).listen(0, '127.0.0.1');
    await new Promise((resolve) => server.once('listening', resolve));
    try {
      const response = await fetch(
        `http://127.0.0.1:${server.address().port}/api/portfolio/preview`,
      );
      assert.equal(response.status, expected);
      assert.equal(response.headers.get('cache-control'), 'no-store');
      assert.equal((await response.json()).portfolio, undefined);
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  }
});
