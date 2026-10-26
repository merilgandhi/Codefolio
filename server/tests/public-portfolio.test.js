import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../app.js';
import { isPublicDocumentPath } from '../../shared/publicRoutes.js';

const html = '<!doctype html><html><head></head><body><div id="root"></div></body></html>';
const fixture = {
  _id: 'private-account-id',
  username: 'test-coder',
  email: 'private@example.invalid',
  passwordHash: 'private-hash',
  tier: 'free',
  templateId: 'split-screen',
  __v: 42,
  profile: {
    name: 'Test Coder',
    bio: '</script><script>alert("unsafe")</script>&\u2028',
    resumeUrl: '',
    socialLinks: [],
  },
  projects: [
    {
      _id: 'public-project-id',
      title: 'A project',
      description: 'Built with care',
      techStack: ['React'],
      repoLink: '',
      liveLink: '',
      screenshot: '',
    },
  ],
  skills: { frontend: ['React'], backend: ['Express'], devops: ['Git'] },
};

async function withServer(run, options = {}) {
  const lookups = [];
  const app = createApp({
    production: true,
    getDatabaseStatus: () => 'connected',
    getFrontendHtml: async () => html,
    findPublicUser: async (username) => {
      lookups.push(username);
      return username === fixture.username ? fixture : null;
    },
    ...options,
  });
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  try {
    await run(`http://127.0.0.1:${server.address().port}`, lookups);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

function bootstrap(html) {
  return JSON.parse(
    html.match(/<script type="application\/json" id="codefolio-public-data">(.*?)<\/script>/s)[1],
  );
}

test('anonymous public API and backend username document expose only the selected public portfolio', () =>
  withServer(async (base) => {
    const api = await fetch(`${base}/api/portfolios/test-coder`);
    assert.equal(api.status, 200);
    assert.equal(api.headers.get('set-cookie'), null);
    assert.equal(api.headers.get('cache-control'), 'no-store');
    const data = await api.json();
    assert.deepEqual(Object.keys(data), ['portfolio']);
    assert.equal(data.portfolio.templateId, 'split-screen');
    assert.equal(data.portfolio.projects[0].id, 'public-project-id');
    const page = await fetch(`${base}/test-coder`);
    assert.equal(page.status, 200);
    assert.match(page.headers.get('content-type'), /text\/html/);
    assert.equal(page.headers.get('set-cookie'), null);
    assert.equal(page.headers.get('cache-control'), 'no-store');
    const source = await page.text();
    assert.deepEqual(bootstrap(source), { status: 200, username: 'test-coder', ...data });
    assert.ok(!source.includes('</script><script>'));
    for (const content of [source, JSON.stringify(data)]) {
      for (const secret of [fixture._id, fixture.email, fixture.passwordHash, '"__v"', '"tier"'])
        assert.ok(!content.includes(secret));
    }
  }));

test('canonical username and showcase alias redirect with safe relative locations', () =>
  withServer(async (base) => {
    for (const path of ['/Test-Coder', '/test-coder/', '/user/test-coder', '/USER/TEST-CODER/']) {
      const response = await fetch(`${base}${path}?source=demo`, {
        redirect: 'manual',
        headers: { Host: 'untrusted.example' },
      });
      assert.equal(response.status, 308, path);
      assert.equal(response.headers.get('location'), '/test-coder?source=demo');
    }
    assert.equal((await fetch(`${base}/api/portfolios/TEST-CODER`)).status, 200);
  }));

test('missing, invalid and reserved usernames return 404 without querying invalid names', () =>
  withServer(async (base, lookups) => {
    for (const path of [
      '/missing-coder',
      '/user/missing-coder',
      '/ab',
      '/__proto__',
      '/admin',
      '/bad.name',
    ]) {
      const response = await fetch(base + path);
      assert.equal(response.status, 404, path);
      assert.equal(bootstrap(await response.text()).status, 404);
    }
    assert.deepEqual(lookups, ['missing-coder', 'missing-coder']);
    for (const name of ['missing-coder', 'admin', 'ab', '%24where', '%7B%22%24ne%22%3Anull%7D']) {
      const response = await fetch(`${base}/api/portfolios/${name}`);
      assert.equal(response.status, 404);
      assert.equal((await response.json()).error.code, 'PORTFOLIO_NOT_FOUND');
    }
  }));

test('database downtime and lookup failures return sanitized 503 responses', async () => {
  for (const options of [
    { getDatabaseStatus: () => 'disconnected' },
    {
      findPublicUser: async () => {
        throw new Error('secret connection detail');
      },
    },
  ]) {
    await withServer(async (base) => {
      for (const path of ['/test-coder', '/api/portfolios/test-coder']) {
        const response = await fetch(base + path);
        assert.equal(response.status, 503);
        assert.ok(!(await response.text()).includes('secret connection detail'));
      }
      assert.equal((await fetch(`${base}/api/portfolios/admin`)).status, 404);
    }, options);
  }
});

test('app, API and asset routes take precedence over username lookup', () =>
  withServer(async (base, lookups) => {
    for (const path of ['/', '/login', '/register', '/dashboard'])
      assert.equal((await fetch(base + path)).status, 200);
    const missingApi = await fetch(`${base}/api/unknown`);
    assert.equal(missingApi.status, 404);
    assert.equal((await missingApi.json()).error.code, 'NOT_FOUND');
    for (const path of ['/assets/missing.js', '/unknown/nested/path'])
      assert.equal((await fetch(base + path)).status, 404);
    assert.deepEqual(lookups, []);
  }));

test('missing frontend returns a useful unavailable document without leaking an exception', () =>
  withServer(
    async (base) => {
      const response = await fetch(`${base}/test-coder`);
      assert.equal(response.status, 503);
      assert.match(await response.text(), /CodeFolio is temporarily unavailable/);
    },
    {
      getFrontendHtml: async () => {
        throw new Error('private file path');
      },
    },
  ));

test('Vite forwards public documents and leaves app routes and modules alone', () => {
  for (const path of ['/test-coder', '/Test-Coder/', '/missing-coder', '/user/test-coder', '/ab'])
    assert.equal(isPublicDocumentPath(path), true, path);
  for (const path of [
    '/',
    '/dashboard',
    '/login',
    '/register',
    '/api/health',
    '/index.html',
    '/theme-init.js',
    '/@vite/client',
    '/src/main.jsx',
    '/assets/app.js',
  ])
    assert.equal(isPublicDocumentPath(path), false, path);
});
