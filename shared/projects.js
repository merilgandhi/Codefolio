import { isWebUrl } from './profile.js';

export const MAX_PROJECTS = 50;

export function validateProject(input) {
  const fields = {};
  if (!input || typeof input !== 'object' || Array.isArray(input))
    return { fields: { root: 'Provide a project object.' } };
  const allowed = ['title', 'description', 'techStack', 'repoLink', 'liveLink', 'screenshot'];
  if (Object.keys(input).some((key) => !allowed.includes(key)))
    return { fields: { root: 'Only project content can be edited here.' } };
  const project = {};
  for (const [key, max, required] of [
    ['title', 120, true],
    ['description', 3000, true],
    ['repoLink', 2048, false],
    ['liveLink', 2048, false],
    ['screenshot', 2048, false],
  ]) {
    const value = input[key] === undefined && !required ? '' : input[key];
    if (typeof value !== 'string' || value.trim().length > max || (required && !value.trim())) {
      fields[key] = required ? `Enter 1–${max} characters.` : `Use at most ${max} characters.`;
      project[key] = '';
    } else {
      project[key] = value.trim();
      if (!required && !isWebUrl(project[key]))
        fields[key] = 'Use a full HTTP or HTTPS URL without credentials.';
    }
  }
  const stack = input.techStack === undefined ? [] : input.techStack;
  if (
    !Array.isArray(stack) ||
    stack.length > 20 ||
    stack.some((tag) => typeof tag !== 'string' || !tag.trim() || tag.trim().length > 50)
  ) {
    fields.techStack = 'Use up to 20 nonempty technologies, each at most 50 characters.';
    project.techStack = [];
  } else {
    project.techStack = stack.map((tag) => tag.trim());
    if (
      new Set(project.techStack.map((tag) => tag.toLowerCase())).size !== project.techStack.length
    )
      fields.techStack = 'List each technology only once.';
  }
  return { fields, project };
}
