import { Router } from 'express';
import { requireAccount } from '../auth/sessions.js';
import { noStore, protectWrites, requireDatabase } from '../middleware/accountApi.js';
import { requirePro } from '../middleware/requirePro.js';
import { accountPlan, validatePlanSelection } from '../../shared/plans.js';
import { createDomainSettingsRouter } from './domains.js';
import { User } from '../models/User.js';

function rejectSelectors(request, response, next) {
  if (Object.keys(request.query).length || (request.body && Object.keys(request.body).length))
    return response.status(400).json({
      error: {
        code: 'INVALID_REQUEST',
        message: 'Plan requests do not accept account selectors or plan overrides.',
      },
    });
  next();
}
const readOnly = (_request, response) =>
  response
    .set('Allow', 'GET, HEAD')
    .status(405)
    .json({
      error: {
        code: 'METHOD_NOT_ALLOWED',
        message: 'Account plans cannot be changed through this endpoint.',
      },
    });
function authenticatedRouter({ production, origins, getDatabaseStatus }) {
  const router = Router();
  router.use(
    noStore,
    protectWrites(origins),
    requireDatabase(getDatabaseStatus),
    requireAccount(production),
  );
  return router;
}
export function createPlanRouter(options) {
  const router = authenticatedRouter(options);
  const responseData = (user) => ({
    plan: accountPlan(user.tier),
    version: user.__v,
    mode: 'demo',
  });
  router.get('/', rejectSelectors, (request, response) =>
    response.json(responseData(request.account)),
  );
  // Explicitly authorized demo selection. Identity always comes from the session.
  router.put('/', async (request, response) => {
    const selection = validatePlanSelection(request.body);
    if (selection.error || Object.keys(request.query).length)
      return response.status(400).json({
        error: {
          code: 'INVALID_PLAN_SELECTION',
          message: selection.error || 'Plan selection does not accept query parameters.',
        },
      });
    const user = await User.findOneAndUpdate(
      { _id: request.account._id, __v: selection.version },
      { $set: { tier: selection.planId }, $inc: { __v: 1 } },
      { returnDocument: 'after', runValidators: true },
    ).select('tier __v');
    if (!user)
      return response.status(409).json({
        error: {
          code: 'EDIT_CONFLICT',
          message:
            'Your account changed in another tab. Reload the saved plan before trying again.',
        },
      });
    response.json(responseData(user));
  });
  router.all('/', (_request, response) =>
    response
      .set('Allow', 'GET, HEAD, PUT')
      .status(405)
      .json({
        error: { code: 'METHOD_NOT_ALLOWED', message: 'Use GET or PUT for demo plan selection.' },
      }),
  );
  return router;
}
export function createPremiumRouter(options) {
  const router = authenticatedRouter(options);
  router.use(requirePro);
  router.use('/domain', createDomainSettingsRouter());
  router.get('/access', rejectSelectors, (request, response) =>
    response.json({ access: accountPlan(request.account.tier).features }),
  );
  router.all('/access', readOnly);
  return router;
}
