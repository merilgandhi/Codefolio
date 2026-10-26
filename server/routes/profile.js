import { Router } from 'express';
import { requireAccount } from '../auth/sessions.js';
import { noStore, protectWrites, requireDatabase } from '../middleware/accountApi.js';
import { validateProfile } from '../../shared/profile.js';

function profileResponse(user) {
  return {
    profile: {
      name: user.profile.name,
      bio: user.profile.bio,
      resumeUrl: user.profile.resumeUrl,
      socialLinks: user.profile.socialLinks.map((link) => ({ label: link.label, url: link.url })),
    },
    version: user.__v,
  };
}

export function createProfileRouter({ production, origins, getDatabaseStatus }) {
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
          message: 'Profile requests do not accept account selectors.',
        },
      });
    }
    next();
  });
  router.get('/', (request, response) => response.json(profileResponse(request.account)));
  router.put('/', async (request, response) => {
    const body = request.body;
    if (
      !body ||
      typeof body !== 'object' ||
      Array.isArray(body) ||
      Object.keys(body).some((key) => !['profile', 'version'].includes(key)) ||
      !Number.isSafeInteger(body.version) ||
      body.version < 0
    ) {
      return response.status(400).json({
        error: {
          code: 'INVALID_REQUEST',
          message: 'Provide only profile and its saved version.',
        },
      });
    }
    const result = validateProfile(body.profile);
    if (Object.keys(result.fields).length) {
      return response.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Please check the profile fields.',
          fields: result.fields,
        },
      });
    }
    // The owner comes exclusively from the authenticated session, never request IDs.
    const user = request.account;
    if (user.__v !== body.version) {
      return response.status(409).json({
        error: {
          code: 'EDIT_CONFLICT',
          message: 'Your account changed in another tab. Reload saved data before saving again.',
        },
      });
    }
    user.profile = result.profile;
    // Explicitly mark a full replacement, including no-op saves, for version consistency.
    user.markModified('profile');
    try {
      await user.save();
    } catch (error) {
      if (error.name === 'VersionError') {
        return response.status(409).json({
          error: {
            code: 'EDIT_CONFLICT',
            message: 'Your account changed in another tab. Reload saved data before saving again.',
          },
        });
      }
      throw error;
    }
    response.json(profileResponse(user));
  });
  return router;
}
