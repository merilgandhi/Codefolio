import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { randomBytes } from 'node:crypto';
import { User } from '../models/User.js';
import { Session } from '../models/Session.js';
import { noStore, protectWrites, requireDatabase } from '../middleware/accountApi.js';
import { isEmail, isUsername } from '../validation/portfolio.js';
import { hashPassword, validPassword, verifyPassword } from '../auth/passwords.js';
import {
  accountResponse,
  clearSessionCookie,
  digestToken,
  issueSession,
  requireAccount,
  SESSION_COOKIE,
} from '../auth/sessions.js';

// Unknown accounts still incur the password derivation cost for valid-shaped passwords.
const dummyHash = hashPassword(randomBytes(24).toString('hex'));

function registrationInput(body) {
  const fields = {};
  const input = body && typeof body === 'object' && !Array.isArray(body) ? body : {};
  if (Object.keys(input).some((key) => !['name', 'username', 'email', 'password'].includes(key)))
    fields.root = 'Only name, username, email and password can be supplied during registration.';
  const name = typeof input.name === 'string' ? input.name.trim() : '';
  const username = typeof input.username === 'string' ? input.username.trim().toLowerCase() : '';
  const email = typeof input.email === 'string' ? input.email.trim().toLowerCase() : '';
  if (!name || name.length > 100) fields.name = 'Enter a name of 1–100 characters.';
  if (!isUsername(username))
    fields.username = 'Choose an available, non-reserved username of 3–30 characters.';
  if (!isEmail(email)) fields.email = 'Enter a valid email address.';
  if (!validPassword(input.password)) fields.password = 'Use a password of 12–128 characters.';
  return { fields, name, username, email, password: input.password };
}

export function createAuthRouter({ production, origins, getDatabaseStatus }) {
  const router = Router();
  router.use(noStore, protectWrites(origins));

  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: {
      error: {
        code: 'RATE_LIMITED',
        message: 'Too many sign-in attempts. Try again in 15 minutes.',
      },
    },
  });
  router.use(['/register', '/login'], limiter);
  router.use(requireDatabase(getDatabaseStatus));

  router.post('/register', async (request, response) => {
    const input = registrationInput(request.body);
    if (Object.keys(input.fields).length) {
      return response.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Please check the highlighted fields.',
          fields: input.fields,
        },
      });
    }
    let user;
    try {
      // Only these fields may be supplied by registration; tier/template/ownership cannot be injected.
      user = await User.create({
        username: input.username,
        email: input.email,
        passwordHash: await hashPassword(input.password),
        profile: { name: input.name },
      });
    } catch (error) {
      if (error.code === 11000) {
        return response.status(409).json({
          error: {
            code: 'ACCOUNT_CONFLICT',
            message: 'That username or email is already registered.',
          },
        });
      }
      throw error;
    }
    // Registration deliberately does not create a login session: signing in is a separate step.
    response.status(201).json({ user: accountResponse(user) });
  });

  router.post('/login', async (request, response) => {
    const input = request.body;
    const email = typeof input?.email === 'string' ? input.email.trim().toLowerCase() : '';
    if (!isEmail(email) || !validPassword(input?.password)) {
      return response.status(401).json({
        error: { code: 'INVALID_CREDENTIALS', message: 'Email or password is incorrect.' },
      });
    }
    const user = await User.findOne({ email }).select('+email +passwordHash');
    const matches = await verifyPassword(input.password, user?.passwordHash || (await dummyHash));
    if (!user || !matches) {
      return response.status(401).json({
        error: { code: 'INVALID_CREDENTIALS', message: 'Email or password is incorrect.' },
      });
    }
    await issueSession(request, response, user, production);
    response.json({ user: accountResponse(user) });
  });

  router.get('/me', requireAccount(production), (request, response) => {
    response.json({ user: accountResponse(request.account) });
  });

  router.post('/logout', async (request, response) => {
    const token = request.cookies?.[SESSION_COOKIE];
    if (typeof token === 'string' && /^[a-f0-9]{64}$/.test(token)) {
      await Session.deleteOne({ tokenHash: digestToken(token) });
    }
    clearSessionCookie(response, production);
    response.status(204).end();
  });

  return router;
}
