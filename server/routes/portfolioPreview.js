import { Router } from 'express';
import { requireAccount } from '../auth/sessions.js';
import { noStore, requireDatabase } from '../middleware/accountApi.js';
import { toPublicPortfolio } from '../serializers/publicPortfolio.js';

export function createPortfolioPreviewRouter({ production, getDatabaseStatus }) {
  const router = Router();
  router.use(noStore, requireDatabase(getDatabaseStatus), requireAccount(production));
  router.get('/', (request, response) => {
    if (Object.keys(request.query).length) {
      return response.status(400).json({
        error: {
          code: 'INVALID_REQUEST',
          message: 'Portfolio previews do not accept account selectors.',
        },
      });
    }
    // Read one consistent saved document, with identity derived only from the session.
    response.json({ portfolio: toPublicPortfolio(request.account) });
  });
  return router;
}
