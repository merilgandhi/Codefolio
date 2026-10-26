import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_TEMPLATE_ID, TEMPLATE_IDS, resolveTemplateId } from '../../shared/portfolio.js';
import { validateTemplateSelection } from '../../shared/template.js';
import { User } from '../models/User.js';
import { accountResponse } from '../auth/sessions.js';
import { toPublicPortfolio } from '../serializers/publicPortfolio.js';
import { createApp } from '../app.js';

test('template resolution accepts canonical IDs, maps old IDs and safely defaults unknown values', () => {
  assert.deepEqual(TEMPLATE_IDS, ['bento', 'split-screen']);
  for (const id of TEMPLATE_IDS) assert.equal(resolveTemplateId(id), id);
  assert.equal(resolveTemplateId('minimalist'), 'bento');
  assert.equal(resolveTemplateId('cyberpunk'), 'split-screen');
  for (const id of [
    undefined,
    null,
    '',
    'unknown',
    'constructor',
    '__proto__',
    'toString',
    {},
    [],
    1,
  ])
    assert.equal(resolveTemplateId(id), DEFAULT_TEMPLATE_ID);
});

test('template writes accept only canonical choices and a valid version without selectors', () => {
  for (const templateId of TEMPLATE_IDS)
    assert.deepEqual(validateTemplateSelection({ templateId, version: 0 }), {
      fields: {},
      templateId,
      version: 0,
    });
  for (const input of [
    null,
    [],
    'bento',
    {},
    { templateId: 'bento' },
    { version: 0 },
    ...['minimalist', 'cyberpunk', 'unknown', '__proto__', null, {}, 0].map((templateId) => ({
      templateId,
      version: 0,
    })),
    ...[-1, 0.1, '0', null, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1].map((version) => ({
      templateId: 'bento',
      version,
    })),
    ...['userId', 'username', 'tier', 'profile', '$set'].map((key) => ({
      templateId: 'bento',
      version: 0,
      [key]: 'injected',
    })),
  ])
    assert.ok(Object.keys(validateTemplateSelection(input).fields).length);
  const original = { templateId: 'split-screen', version: 7 };
  validateTemplateSelection(original);
  assert.deepEqual(original, { templateId: 'split-screen', version: 7 });
});

test('new and legacy account records validate; serializers normalize IDs without rewriting documents', async () => {
  for (const id of [...TEMPLATE_IDS, 'minimalist', 'cyberpunk']) {
    const user = new User({
      username: 'template-owner',
      email: 'owner@example.invalid',
      passwordHash: 'x'.repeat(64),
      profile: { name: 'Template owner' },
      templateId: id,
    });
    user.profile.bio = 'A normal profile edit must still validate.';
    await user.validate();
    assert.equal(user.templateId, id);
    for (const source of [user, user.toObject()]) {
      assert.equal(toPublicPortfolio(source).templateId, resolveTemplateId(id));
      assert.equal(accountResponse(source).templateId, resolveTemplateId(id));
    }
    assert.equal(user.templateId, id);
  }
  const unknown = new User({
    username: 'template-owner',
    email: 'owner@example.invalid',
    passwordHash: 'x'.repeat(64),
    profile: { name: 'Owner' },
  }).toObject();
  unknown.templateId = 'future-template';
  assert.equal(toPublicPortfolio(unknown).templateId, DEFAULT_TEMPLATE_ID);
  assert.equal(accountResponse(unknown).templateId, DEFAULT_TEMPLATE_ID);
  assert.equal(unknown.templateId, 'future-template');
});

test('template endpoints require a session, reject unsafe writes and handle database downtime', async () => {
  const server = createApp({ getDatabaseStatus: () => 'connected' }).listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}/api/template`;
  try {
    const response = await fetch(base);
    assert.equal(response.status, 401);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    for (const [headers, expected] of [
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
      [
        {
          'Content-Type': 'application/json',
          'X-Codefolio-Request': '1',
          'Sec-Fetch-Site': 'cross-site',
        },
        403,
      ],
      [{ 'Content-Type': 'text/plain', 'X-Codefolio-Request': '1' }, 415],
    ]) {
      const result = await fetch(base, { method: 'PUT', headers, body: '{}' });
      assert.equal(result.status, expected);
      assert.equal(result.headers.get('cache-control'), 'no-store');
    }
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
  const unavailable = createApp().listen(0, '127.0.0.1');
  await new Promise((resolve) => unavailable.once('listening', resolve));
  try {
    assert.equal(
      (await fetch(`http://127.0.0.1:${unavailable.address().port}/api/template`)).status,
      503,
    );
  } finally {
    await new Promise((resolve) => unavailable.close(resolve));
  }
});
