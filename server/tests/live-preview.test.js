import test from 'node:test';
import assert from 'node:assert/strict';
import {
  draftTags,
  previewProjects,
  withPortfolioDraft,
} from '../../src/dashboard/draftPortfolio.js';

const saved = {
  username: 'preview-owner',
  templateId: 'bento',
  isPro: false,
  profile: { name: 'Saved Name', bio: 'Saved bio', resumeUrl: '', socialLinks: [] },
  projects: [
    {
      id: 'saved-project',
      title: 'Saved Project',
      description: 'Saved description',
      techStack: ['React'],
      repoLink: '',
      liveLink: '',
      screenshot: '',
    },
  ],
  skills: { frontend: ['React'], backend: ['Express'], devops: ['Git'] },
};

test('profile drafts update visible fields without changing saved data or account identity', () => {
  const before = structuredClone(saved);
  const draft = withPortfolioDraft(saved, {
    username: 'another-owner',
    isPro: true,
    profile: {
      name: '',
      bio: 'Typing a new bio',
      resumeUrl: 'javascript:alert(1)',
      email: 'private@example.invalid',
      socialLinks: [
        { label: 'Unsafe', url: 'data:text/html,test' },
        { label: 'GitHub', url: 'https://github.com/' },
      ],
    },
  });
  assert.equal(draft.profile.bio, 'Typing a new bio');
  assert.equal(draft.profile.name, '');
  assert.equal(draft.profile.resumeUrl, '');
  assert.equal(draft.profile.socialLinks.length, 1);
  assert.ok(!JSON.stringify(draft).includes('private@example.invalid'));
  assert.equal(draft.username, saved.username);
  assert.equal(draft.isPro, false);
  assert.deepEqual(saved, before);
  assert.equal(withPortfolioDraft(saved, null), saved);
});

test('skill drafts include in-progress tokens, remove empty/duplicate tags and allow clearing a category', () => {
  assert.deepEqual(draftTags('React, react, , TypeScript, Node'), ['React', 'TypeScript', 'Node']);
  const draft = withPortfolioDraft(saved, {
    skills: { frontend: 'React, Vue', backend: '', devops: 'Docker, docker' },
  });
  assert.deepEqual(draft.skills, { frontend: ['React', 'Vue'], backend: [], devops: ['Docker'] });
  assert.deepEqual(saved.skills.backend, ['Express']);
});

test('project drafts replace only the edited project, append new projects and disappear on cancel', () => {
  const values = {
    title: 'Draft Project',
    description: 'Unsaved description',
    techStackText: 'React, react, Vue',
    repoLink: 'javascript:alert(1)',
    liveLink: 'https://example.com/',
    screenshot: 'data:image/svg+xml,test',
  };
  const before = structuredClone(saved.projects);
  const edited = previewProjects(saved.projects, values, {
    open: true,
    dirty: true,
    selectedId: 'saved-project',
  });
  assert.equal(edited.length, 1);
  assert.equal(edited[0].id, 'saved-project');
  assert.equal(edited[0].title, 'Draft Project');
  assert.deepEqual(edited[0].techStack, ['React', 'Vue']);
  assert.equal(edited[0].repoLink, '');
  assert.equal(edited[0].screenshot, '');
  const added = previewProjects(saved.projects, values, {
    open: true,
    dirty: true,
    selectedId: null,
  });
  assert.equal(added.length, 2);
  assert.equal(added[1].title, 'Draft Project');
  assert.equal(
    previewProjects(saved.projects, values, { open: false, dirty: true }),
    saved.projects,
  );
  assert.equal(
    previewProjects(saved.projects, values, { open: true, dirty: false }),
    saved.projects,
  );
  assert.deepEqual(saved.projects, before);
});

test('layout drafts resolve through existing compatibility rules and preserve saved content', () => {
  assert.equal(
    withPortfolioDraft(saved, { templateId: 'split-screen' }).templateId,
    'split-screen',
  );
  assert.equal(withPortfolioDraft(saved, { templateId: 'cyberpunk' }).templateId, 'split-screen');
  assert.equal(withPortfolioDraft(saved, { templateId: '__proto__' }).templateId, 'bento');
  assert.equal(saved.templateId, 'bento');
});
