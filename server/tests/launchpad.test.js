import test from 'node:test';
import assert from 'node:assert/strict';
import { launchpadProgress } from '../../shared/launchpad.js';

const empty = () => ({
  templateId: 'bento',
  profile: { name: 'New Developer', bio: '' },
  projects: [],
  skills: { frontend: [], backend: [], devops: [] },
});
test('a new account has a ready default layout, but its introduction and work are not falsely marked complete', () => {
  const result = launchpadProgress(empty());
  assert.equal(result.completed, 1);
  assert.equal(result.next.id, 'profile');
  assert.deepEqual(
    result.steps.map((step) => step.done),
    [false, false, false, true],
  );
  assert.equal(result.projectCount, 0);
  assert.equal(result.skillCount, 0);
});
test('saved setup advances through introduction, projects and skills and finishes only after essentials exist', () => {
  const portfolio = empty();
  portfolio.profile.bio = '   ';
  assert.equal(launchpadProgress(portfolio).next.id, 'profile');
  portfolio.profile.bio = 'Building useful developer tools.';
  assert.equal(launchpadProgress(portfolio).next.id, 'projects');
  portfolio.projects = [{ title: 'A saved project' }];
  assert.equal(launchpadProgress(portfolio).next.id, 'skills');
  portfolio.skills.backend = ['Node.js', 'MongoDB'];
  const result = launchpadProgress(portfolio);
  assert.equal(result.completed, 4);
  assert.equal(result.next, null);
  assert.equal(result.projectCount, 1);
  assert.equal(result.skillCount, 2);
  portfolio.skills.backend = [];
  assert.equal(launchpadProgress(portfolio).next.id, 'skills');
});
test('readiness preserves the saved source and identifies canonical, legacy and fallback layouts', () => {
  for (const [templateId, expected] of [
    ['split-screen', 'Split-Screen Engineer'],
    ['cyberpunk', 'Split-Screen Engineer'],
    ['minimalist', 'Bento Developer'],
    ['unknown', 'Bento Developer'],
  ]) {
    const portfolio = { ...empty(), templateId };
    const before = structuredClone(portfolio);
    const result = launchpadProgress(portfolio);
    assert.equal(result.template.name, expected);
    assert.equal(result.steps[3].done, true);
    assert.deepEqual(portfolio, before);
  }
});
