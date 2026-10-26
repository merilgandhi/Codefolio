import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { User } from '../models/User.js';
import { noStore, protectWrites } from '../middleware/accountApi.js';
import { publicUsername } from '../../shared/publicRoutes.js';
import { isContactEmail, validateContact } from '../../shared/contact.js';

export function findContactOwner(username) {
  return User.findOne({ username })
    .select('username profile.name +email -_id')
    .lean()
    .maxTimeMS(5000);
}
const unavailable = {
  error: {
    code: 'CONTACT_UNAVAILABLE',
    message: 'Contact email is temporarily unavailable. Please try again later.',
  },
};
const accepted = { message: 'Message sent. Thanks for reaching out.' };

export function createContactRouter({
  origins,
  getDatabaseStatus,
  mailer,
  findOwner = findContactOwner,
  limits = {},
}) {
  const router = Router();
  const limited = {
    error: {
      code: 'RATE_LIMITED',
      message: 'Too many contact requests. Please wait before trying again.',
    },
  };
  const common = { standardHeaders: 'draft-8', legacyHeaders: false, message: limited };
  router.use(noStore, protectWrites(origins));
  router.post(
    '/:username',
    rateLimit({ ...common, windowMs: 15 * 60 * 1000, limit: limits.ip || 5 }),
    (request, response, next) => {
      if (!publicUsername(request.params.username))
        return response.status(404).json({
          error: { code: 'PORTFOLIO_NOT_FOUND', message: 'This portfolio could not be found.' },
        });
      next();
    },
    rateLimit({
      ...common,
      windowMs: 60 * 60 * 1000,
      limit: limits.recipient || 10,
      keyGenerator: (request) => request.params.username.toLowerCase(),
    }),
    rateLimit({
      ...common,
      windowMs: 60 * 60 * 1000,
      limit: limits.global || 100,
      keyGenerator: () => 'contact-global',
    }),
    async (request, response) => {
      const result = validateContact(request.body);
      if (Object.keys(result.fields).length)
        return response.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Check the highlighted fields.',
            fields: result.fields,
          },
        });
      if (result.honeypot) return response.json(accepted);
      if (!mailer.configured || getDatabaseStatus() !== 'connected')
        return response.status(503).json(unavailable);
      try {
        const owner = await findOwner(publicUsername(request.params.username));
        if (!owner)
          return response.status(404).json({
            error: { code: 'PORTFOLIO_NOT_FOUND', message: 'This portfolio could not be found.' },
          });
        if (!isContactEmail(owner.email)) return response.status(503).json(unavailable);
        await mailer.send({ owner, contact: result.contact });
        return response.json(accepted);
      } catch {
        return response.status(503).json(unavailable);
      }
    },
  );
  return router;
}
