import { Router } from 'express';
import { User } from '../models/User.js';
import { noStore } from '../middleware/accountApi.js';
import { domainRedirectPath, normalizeDomain, validateDomainChange } from '../../shared/domains.js';
import { publicUsername } from '../../shared/publicRoutes.js';

const conflict = {
  code: 'EDIT_CONFLICT',
  message: 'Your account changed in another tab. Reload saved settings before saving again.',
};
const settings = (user) => ({
  domain: user.customDomain || null,
  version: user.__v,
  redirectPath: user.customDomain ? domainRedirectPath(user.customDomain) : null,
});
function noSelectors(request, response, next) {
  if (Object.keys(request.query).length)
    return response.status(400).json({
      error: {
        code: 'INVALID_REQUEST',
        message: 'Domain requests do not accept query parameters.',
      },
    });
  next();
}

// Mounted inside the authenticated, freshly checked Pro authorization boundary.
export function createDomainSettingsRouter() {
  const router = Router();
  router.use(noSelectors);
  router.get('/', (request, response) => response.json(settings(request.account)));
  const change = (remove) => async (request, response) => {
    const result = validateDomainChange(request.body, remove);
    if (Object.keys(result.fields).length)
      return response.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Please check the domain settings.',
          fields: result.fields,
        },
      });
    // Wait for the unique index before accepting claims. No arbitrary account IDs.
    await User.init();
    try {
      // Atomic ownership, tier and version checks also cover a simultaneous downgrade.
      const user = await User.findOneAndUpdate(
        { _id: request.account._id, tier: 'pro', __v: result.version },
        {
          ...(remove ? { $unset: { customDomain: 1 } } : { $set: { customDomain: result.domain } }),
          $inc: { __v: 1 },
        },
        { returnDocument: 'after', runValidators: true },
      );
      if (!user) return response.status(409).json({ error: conflict });
      return response.json(settings(user));
    } catch (error) {
      if (error.code === 11000)
        return response.status(409).json({
          error: {
            code: 'DOMAIN_IN_USE',
            message: 'This domain is already assigned. Choose another domain.',
            fields: { domain: 'This domain is already assigned.' },
          },
        });
      throw error;
    }
  };
  router.put('/', change(false));
  router.delete('/', change(true));
  router.all('/', (_request, response) =>
    response
      .set('Allow', 'GET, HEAD, PUT, DELETE')
      .status(405)
      .json({
        error: {
          code: 'METHOD_NOT_ALLOWED',
          message: 'Use GET, PUT or DELETE for domain settings.',
        },
      }),
  );
  return router;
}

async function findDomainOwner(domain) {
  return User.findOne({ customDomain: domain, tier: 'pro' })
    .select('username tier -_id')
    .lean()
    .maxTimeMS(5000);
}
export function createDomainRedirectRouter({ getDatabaseStatus, findOwner = findDomainOwner }) {
  const router = Router();
  router.use(
    noStore,
    (_request, response, next) => {
      response.set('X-Robots-Tag', 'noindex, nofollow');
      next();
    },
    noSelectors,
  );
  router.get('/:domain', async (request, response) => {
    const domain = normalizeDomain(request.params.domain);
    if (!domain)
      return response
        .status(400)
        .json({ error: { code: 'INVALID_DOMAIN', message: 'Provide a valid domain hostname.' } });
    const unavailable = () =>
      response.status(503).json({
        error: {
          code: 'DOMAIN_UNAVAILABLE',
          message: 'Domain redirects are temporarily unavailable. Please try again.',
        },
      });
    if (getDatabaseStatus() !== 'connected') return unavailable();
    try {
      const user = await findOwner(domain);
      const username = publicUsername(user?.username);
      if (!username || user.tier !== 'pro')
        return response.status(404).json({
          error: {
            code: 'DOMAIN_NOT_FOUND',
            message: 'No active Pro portfolio is assigned to this domain.',
          },
        });
      // Relative, app-owned destination. Host/Forwarded headers and URLs cannot choose it.
      return response.redirect(302, `/${username}`);
    } catch {
      return unavailable();
    }
  });
  return router;
}
