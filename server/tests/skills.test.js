import test from 'node:test';
import assert from 'node:assert/strict';
import { validateSkills } from '../../shared/skills.js';
import { createApp } from '../app.js';

const empty = () => ({ frontend: [], backend: [], devops: [] });

test('skills validation trims all categories without mutating the input', () => {
  const input = {
    frontend: [' React ', ' TypeScript '],
    backend: [' Node.js '],
    devops: [' Docker '],
  };
  assert.deepEqual(validateSkills(input), {
    fields: {},
    skills: { frontend: ['React', 'TypeScript'], backend: ['Node.js'], devops: ['Docker'] },
  });
  assert.equal(input.frontend[0], ' React ');
  assert.deepEqual(validateSkills(empty()), { fields: {}, skills: empty() });
  assert.deepEqual(
    validateSkills({ frontend: ['TypeScript'], backend: ['TypeScript'], devops: [] }).fields,
    {},
  );
});

test('skills require three bounded arrays of nonempty, distinct strings', () => {
  for (const input of [
    null,
    [],
    'React',
    {},
    { frontend: [] },
    { ...empty(), Frontend: [] },
    { ...empty(), tier: 'pro' },
  ]) {
    assert.ok(Object.keys(validateSkills(input).fields).length);
  }
  for (const frontend of [
    null,
    'React',
    [null],
    [{}],
    [''],
    ['  '],
    ['React', 'react'],
    [' React ', 'React'],
    ['x'.repeat(51)],
    Array.from({ length: 41 }, (_, i) => `skill-${i}`),
  ]) {
    assert.ok(validateSkills({ ...empty(), frontend }).fields.frontend);
  }
  assert.deepEqual(
    validateSkills({
      ...empty(),
      frontend: Array.from({ length: 40 }, (_, i) => `${i}`.padEnd(50, 'x')),
    }).fields,
    {},
  );
});

test('skills endpoints reject anonymous and cross-site requests and fail promptly without a database', async () => {
  const server = createApp({ getDatabaseStatus: () => 'connected' }).listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  const url = `http://127.0.0.1:${server.address().port}/api/skills`;
  try {
    assert.equal((await fetch(url)).status, 401);
    for (const [headers, status] of [
      [{ 'Content-Type': 'application/json', 'X-Codefolio-Request': '1' }, 401],
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
    ]) {
      const response = await fetch(url, { method: 'PUT', headers, body: '{}' });
      assert.equal(response.status, status);
      assert.equal(response.headers.get('Cache-Control'), 'no-store');
    }
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
  const unavailable = createApp().listen(0, '127.0.0.1');
  await new Promise((resolve) => unavailable.once('listening', resolve));
  try {
    assert.equal(
      (await fetch(`http://127.0.0.1:${unavailable.address().port}/api/skills`)).status,
      503,
    );
  } finally {
    await new Promise((resolve) => unavailable.close(resolve));
  }
});
