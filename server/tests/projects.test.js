import test from 'node:test';
import assert from 'node:assert/strict';
import { validateProject } from '../../shared/projects.js';
import { createApp } from '../app.js';

test('project validation trims every field and preserves technology arrays', () => {
  assert.deepEqual(
    validateProject({
      title: ' Project ',
      description: ' Description ',
      techStack: [' React ', ' Node.js '],
      repoLink: ' https://github.com/example/project ',
      liveLink: ' https://example.com ',
      screenshot: ' https://example.com/image.webp ',
    }),
    {
      fields: {},
      project: {
        title: 'Project',
        description: 'Description',
        techStack: ['React', 'Node.js'],
        repoLink: 'https://github.com/example/project',
        liveLink: 'https://example.com',
        screenshot: 'https://example.com/image.webp',
      },
    },
  );
  assert.deepEqual(
    validateProject({ title: 'App', description: 'Description' }).project.techStack,
    [],
  );
});

test('project validation rejects missing/oversized text, unsafe links and privileged fields', () => {
  const valid = { title: 'App', description: 'Description' };
  for (const input of [
    null,
    [],
    {},
    { ...valid, title: '' },
    { ...valid, title: {} },
    { ...valid, title: 'x'.repeat(121) },
    { ...valid, description: 'x'.repeat(3001) },
    { ...valid, _id: 'injected' },
    { ...valid, tier: 'pro' },
    ...['repoLink', 'liveLink', 'screenshot'].flatMap((field) =>
      ['javascript:alert(1)', '/relative', 'https://u:p@example.com', 'x'.repeat(2049), {}].map(
        (value) => ({ ...valid, [field]: value }),
      ),
    ),
  ]) {
    assert.ok(Object.keys(validateProject(input).fields).length);
  }
});

test('technologies must be a bounded array of distinct nonempty strings', () => {
  for (const techStack of [
    null,
    'React',
    [null],
    [''],
    ['React', 'react'],
    ['React', ' React '],
    ['x'.repeat(51)],
    Array.from({ length: 21 }, (_, i) => `tool-${i}`),
  ]) {
    assert.ok(
      validateProject({ title: 'App', description: 'Description', techStack }).fields.techStack,
    );
  }
});

test('project APIs reject anonymous access and unsafe writes', async () => {
  const server = createApp({ getDatabaseStatus: () => 'connected' }).listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}/api/projects`;
  try {
    assert.equal((await fetch(base)).status, 401);
    for (const method of ['POST', 'PUT', 'DELETE']) {
      const url = method === 'POST' ? base : `${base}/000000000000000000000000`;
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', 'X-Codefolio-Request': '1' },
        body: '{}',
      });
      assert.equal(response.status, 401);
      assert.equal(response.headers.get('Cache-Control'), 'no-store');
      assert.equal(
        (await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: '{}' }))
          .status,
        403,
      );
    }
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
