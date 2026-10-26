import { Router } from 'express';
import { requireAccount } from '../auth/sessions.js';
import { noStore, protectWrites, requireDatabase } from '../middleware/accountApi.js';
import { SKILL_CATEGORIES } from '../../shared/portfolio.js';
import { validateSkills } from '../../shared/skills.js';

const skillsResponse = (user) => ({
  skills: Object.fromEntries(
    SKILL_CATEGORIES.map((category) => [category, [...user.skills[category]]]),
  ),
  version: user.__v,
});
const conflict = (response) =>
  response.status(409).json({
    error: {
      code: 'EDIT_CONFLICT',
      message: 'Your account changed in another tab. Reload saved skills before saving again.',
    },
  });

export function createSkillsRouter({ production, origins, getDatabaseStatus }) {
  const router = Router();
  router.use(
    noStore,
    protectWrites(origins),
    requireDatabase(getDatabaseStatus),
    requireAccount(production),
  );
  router.use((request, response, next) => {
    if (Object.keys(request.query).length) {
      return response.status(400).json({
        error: {
          code: 'INVALID_REQUEST',
          message: 'Skills requests do not accept account selectors.',
        },
      });
    }
    next();
  });
  router.get('/', (request, response) => response.json(skillsResponse(request.account)));
  router.put('/', async (request, response) => {
    const body = request.body;
    if (
      !body ||
      typeof body !== 'object' ||
      Array.isArray(body) ||
      Object.keys(body).some((key) => !['skills', 'version'].includes(key)) ||
      !Number.isSafeInteger(body.version) ||
      body.version < 0
    ) {
      return response.status(400).json({
        error: {
          code: 'INVALID_REQUEST',
          message: 'Provide only categorized skills and their saved version.',
        },
      });
    }
    const result = validateSkills(body.skills);
    if (Object.keys(result.fields).length) {
      return response.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Please check the skill lists.',
          fields: result.fields,
        },
      });
    }
    const user = request.account; // The authenticated session is the only source of ownership.
    if (user.__v !== body.version) return conflict(response);
    user.skills = result.skills;
    user.markModified('skills');
    try {
      await user.save();
    } catch (error) {
      if (error.name === 'VersionError') return conflict(response);
      throw error;
    }
    response.json(skillsResponse(user));
  });
  return router;
}
