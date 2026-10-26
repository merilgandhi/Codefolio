import { SKILL_CATEGORIES } from './portfolio.js';

export const MAX_SKILLS_PER_CATEGORY = 40;
export const MAX_SKILL_LENGTH = 50;
export const SKILL_LABELS = Object.freeze({
  frontend: 'Frontend',
  backend: 'Backend',
  devops: 'DevOps',
});

export function validateSkills(input) {
  const fields = {};
  const skills = {};
  if (!input || typeof input !== 'object' || Array.isArray(input))
    return { fields: { root: 'Provide the three categorized skill lists.' } };
  if (Object.keys(input).some((key) => !SKILL_CATEGORIES.includes(key))) {
    return {
      fields: { root: 'Only Frontend, Backend and DevOps skill lists can be edited here.' },
    };
  }
  for (const category of SKILL_CATEGORIES) {
    const list = input[category];
    if (
      !Array.isArray(list) ||
      list.length > MAX_SKILLS_PER_CATEGORY ||
      list.some(
        (skill) =>
          typeof skill !== 'string' || !skill.trim() || skill.trim().length > MAX_SKILL_LENGTH,
      )
    ) {
      fields[category] = 'Use up to 40 nonempty skills, each at most 50 characters.';
      skills[category] = [];
      continue;
    }
    skills[category] = list.map((skill) => skill.trim());
    if (
      new Set(skills[category].map((skill) => skill.toLowerCase())).size !== skills[category].length
    ) {
      fields[category] = 'List each skill only once in this category.';
    }
  }
  return { fields, skills };
}
