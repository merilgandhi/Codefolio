import { SKILL_CATEGORIES, resolveTemplateId } from '../../shared/portfolio.js';
import { toProject } from './project.js';
import { isProTier } from '../../shared/plans.js';

// Explicit allowlist works with both Mongoose documents and lean query results.
// Do not replace this with object spreading or a denylist of private fields.
export function toPublicPortfolio(user) {
  return {
    username: user.username,
    templateId: resolveTemplateId(user.templateId),
    isPro: isProTier(user.tier),
    profile: {
      name: user.profile.name,
      bio: user.profile.bio,
      resumeUrl: user.profile.resumeUrl,
      socialLinks: user.profile.socialLinks.map((link) => ({ label: link.label, url: link.url })),
    },
    projects: user.projects.map(toProject),
    skills: Object.fromEntries(
      SKILL_CATEGORIES.map((category) => [category, [...user.skills[category]]]),
    ),
  };
}
