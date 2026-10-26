import { SKILL_CATEGORIES, resolveTemplateId } from '../../shared/portfolio.js';
import { isWebUrl } from '../../shared/profile.js';

const text = (value) => (typeof value === 'string' ? value : '');
const url = (value) => (isWebUrl(text(value).trim()) ? text(value).trim() : '');

export function draftTags(value) {
  const tags = Array.isArray(value) ? value : text(value).split(',');
  const seen = new Set();
  return tags
    .map(text)
    .map((tag) => tag.trim())
    .filter((tag) => {
      if (!tag || seen.has(tag.toLowerCase())) return false;
      seen.add(tag.toLowerCase());
      return true;
    });
}

export function draftProject(values, id) {
  return {
    id,
    title: text(values.title) || 'Untitled project',
    description: text(values.description),
    techStack: draftTags(values.techStackText),
    repoLink: url(values.repoLink),
    liveLink: url(values.liveLink),
    screenshot: url(values.screenshot),
  };
}

export function previewProjects(projects, values, { open, dirty, selectedId }) {
  if (!open || !dirty) return projects;
  const draft = draftProject(values, selectedId || 'unsaved-project');
  return selectedId
    ? projects.map((project) => (project.id === selectedId ? draft : project))
    : [...projects, draft];
}

// Drafts are presentation-only. Never use this adapter to prepare API writes.
export function withPortfolioDraft(saved, patch) {
  if (!patch) return saved;
  return {
    ...saved,
    ...(patch.profile
      ? {
          profile: {
            name: text(patch.profile.name),
            bio: text(patch.profile.bio),
            resumeUrl: url(patch.profile.resumeUrl),
            socialLinks: (patch.profile.socialLinks || [])
              .filter((link) => link && url(link.url))
              .map((link) => ({ label: text(link.label), url: url(link.url) })),
          },
        }
      : {}),
    ...(patch.projects ? { projects: patch.projects } : {}),
    ...(patch.skills
      ? {
          skills: Object.fromEntries(
            SKILL_CATEGORIES.map((category) => [category, draftTags(patch.skills[category])]),
          ),
        }
      : {}),
    ...(patch.templateId ? { templateId: resolveTemplateId(patch.templateId) } : {}),
  };
}
