import { isProTier } from '../../shared/plans.js';

// Run after requireAccount, which reads the current account from MongoDB on
// every request. Client state, request headers and body flags grant no access.
export function requirePro(request, response, next) {
  if (!request.account)
    return response
      .status(401)
      .json({ error: { code: 'UNAUTHENTICATED', message: 'Please sign in to continue.' } });
  if (!isProTier(request.account.tier))
    return response
      .status(403)
      .json({ error: { code: 'PRO_REQUIRED', message: 'This feature requires a Pro account.' } });
  next();
}
