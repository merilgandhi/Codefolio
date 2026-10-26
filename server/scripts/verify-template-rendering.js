import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';

// A separate cache prevents this check from invalidating an active dev browser's React modules.
const vite = await createServer({
  cacheDir: 'node_modules/.vite-renderer-check',
  server: { middlewareMode: true, hmr: false, watch: null },
  appType: 'custom',
});
try {
  const { default: PortfolioRenderer } = await vite.ssrLoadModule(
    '/src/portfolio/PortfolioRenderer.jsx',
  );
  const { getTemplate, TEMPLATE_REGISTRY } = await vite.ssrLoadModule(
    '/src/portfolio/templateRegistry.js',
  );
  const portfolio = {
    username: 'render-check',
    profile: {
      name: 'Renderer Owner',
      bio: 'Saved biography.',
      resumeUrl: 'https://example.com/resume.pdf',
      socialLinks: [{ label: 'GitHub', url: 'https://github.com/' }],
    },
    projects: [
      {
        id: 'project-one',
        title: 'Saved Project',
        description: 'Complete saved project description.',
        techStack: ['React'],
        repoLink: 'https://github.com/',
        liveLink: 'https://example.com/',
        screenshot: 'https://example.com/screenshot.png',
      },
    ],
    skills: { frontend: ['React'], backend: ['Express'], devops: ['Docker'] },
  };
  for (const [id, expected] of [
    ['bento', 'bento'],
    ['split-screen', 'split-screen'],
    ['minimalist', 'bento'],
    ['cyberpunk', 'split-screen'],
    ['unknown', 'bento'],
    ['__proto__', 'bento'],
    ['constructor', 'bento'],
    [undefined, 'bento'],
    [null, 'bento'],
  ]) {
    assert.equal(getTemplate(id), TEMPLATE_REGISTRY[expected]);
    assert.equal(typeof getTemplate(id).Component, 'function');
    const html = renderToStaticMarkup(
      createElement(PortfolioRenderer, { portfolio: { ...portfolio, templateId: id } }),
    );
    for (const text of [
      'Renderer Owner',
      'Saved biography.',
      'Saved Project',
      'Complete saved project description.',
      'React',
      'Express',
      'Docker',
      'https://github.com/',
      'https://example.com/',
      'https://example.com/resume.pdf',
      'https://example.com/screenshot.png',
    ])
      assert.ok(html.includes(text));
    assert.equal(html.includes('Developer profile'), expected === 'split-screen');
    assert.ok(html.includes('loading="eager"'));
    assert.ok(html.includes('rel="noopener noreferrer"'));
  }
  console.log(
    'PASS: Both registry components render all fields; legacy IDs and unsupported/prototype-like IDs safely choose the expected layout.',
  );
  const html = renderToStaticMarkup(
    createElement(PortfolioRenderer, {
      portfolio: { ...portfolio, templateId: 'split-screen' },
      templateId: 'unknown',
      embedded: true,
    }),
  );
  assert.ok(!html.includes('Developer profile'));
  assert.ok(!html.includes('<h1'));
  console.log(
    'PASS: Explicit selection overrides the saved ID, and embedded rendering preserves the dashboard heading level.',
  );
  for (const templateId of ['bento', 'split-screen'])
    for (const isPro of [true, false, undefined, 'true', 1]) {
      const output = renderToStaticMarkup(
        createElement(PortfolioRenderer, { portfolio: { ...portfolio, templateId, isPro } }),
      );
      assert.equal(output.includes('aria-label="Pro account"'), isPro === true);
    }
  console.log(
    'PASS: Both portfolio layouts show the Pro badge only for the explicit public Pro flag.',
  );
} finally {
  await vite.close();
}
