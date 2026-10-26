import { Router } from 'express';
import { requireAccount } from '../auth/sessions.js';
import { noStore, protectWrites, requireDatabase } from '../middleware/accountApi.js';
import { toPublicPortfolio } from '../serializers/publicPortfolio.js';
import { validateTemplateSelection } from '../../shared/template.js';

const responseData = (user) => ({ portfolio: toPublicPortfolio(user), version: user.__v });
const conflict = (response) =>
  response.status(409).json({
    error: {
      code: 'EDIT_CONFLICT',
      message:
        'Your account changed in another tab. Reload saved content before saving your template again.',
    },
  });

export function createTemplateRouter({ production, origins, getDatabaseStatus }) {
  const router = Router();
  router.use(
    noStore,
    protectWrites(origins),
    requireDatabase(getDatabaseStatus),
    requireAccount(production),
  );
  router.use((request, response, next) => {
    if (Object.keys(request.query).length)
      return response.status(400).json({
        error: {
          code: 'INVALID_REQUEST',
          message: 'Template requests do not accept account selectors.',
        },
      });
    next();
  });
  // One consistent saved snapshot supplies both the choice/version and its preview.
  router.get('/', (request, response) => response.json(responseData(request.account)));
  router.put('/', async (request, response) => {
    const result = validateTemplateSelection(request.body);
    if (Object.keys(result.fields).length)
      return response.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Please check your template choice.',
          fields: result.fields,
        },
      });
    const user = request.account; // Session identity is the only source of ownership.
    if (user.__v !== result.version) return conflict(response);
    user.templateId = result.templateId;
    user.markModified('templateId');
    try {
      await user.save();
    } catch (error) {
      if (error.name === 'VersionError') return conflict(response);
      throw error;
    }
    response.json(responseData(user));
  });
  return router;
}
