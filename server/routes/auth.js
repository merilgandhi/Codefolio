import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { randomBytes } from 'node:crypto';
import { User } from '../models/User.js';
import { Session } from '../models/Session.js';
import { PasswordResetToken } from '../models/PasswordResetToken.js';
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

export function createAuthRouter({ production, origins, getDatabaseStatus, mailer }) {
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
  const recoveryLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 5,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: {
      error: {
        code: 'RATE_LIMITED',
        message: 'Too many recovery attempts. Try again in 15 minutes.',
      },
    },
  });
  router.use(['/password-reset/request', '/password-reset/confirm'], recoveryLimiter);
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

  router.post('/password-reset/request', async (request, response) => {
    const email =
      typeof request.body?.email === 'string' ? request.body.email.trim().toLowerCase() : '';
    if (!isEmail(email)) {
      return response.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Enter a valid email address.',
          fields: { email: 'Enter a valid email address.' },
        },
      });
    }

    // Keep the response identical for registered and unknown addresses.
    const result = {
      message: 'If an account matches that address, a password reset link will be sent.',
    };
    const user = await User.findOne({ email }).select('_id +email').lean().maxTimeMS(5000);
    if (user && mailer?.configured) {
      const token = randomBytes(32).toString('hex');
      const tokenHash = digestToken(token);
      try {
        await PasswordResetToken.findOneAndUpdate(
          { userId: user._id },
          {
            $set: {
              tokenHash,
              expiresAt: new Date(Date.now() + 30 * 60 * 1000),
            },
          },
          { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
        );
        const resetUrl = new URL('/reset-password', origins[0]);
        resetUrl.hash = new URLSearchParams({ token }).toString();
        void mailer
          .sendPasswordReset({ email: user.email, resetUrl: resetUrl.toString() })
          .catch(() => {
            void PasswordResetToken.deleteOne({ userId: user._id, tokenHash }).catch(() => {});
            console.error('Password reset email could not be sent.');
          });
      } catch {
        await PasswordResetToken.deleteOne({ userId: user._id, tokenHash }).catch(() => {});
        console.error('Password reset email could not be sent.');
      }
    } else if (user) {
      console.error('Password reset email is not configured.');
    }
    response.status(202).json(result);
  });

  router.post('/password-reset/confirm', async (request, response) => {
    const token = typeof request.body?.token === 'string' ? request.body.token : '';
    const password = request.body?.password;
    const fields = {};
    if (!/^[a-f0-9]{64}$/.test(token)) fields.token = 'This reset link is invalid or expired.';
    if (!validPassword(password)) fields.password = 'Use a password of 12–128 characters.';
    if (Object.keys(fields).length) {
      return response.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Please check the highlighted fields.',
          fields,
        },
      });
    }

    const tokenHash = digestToken(token);
    const expiresAt = { $gt: new Date() };
    const exists = await PasswordResetToken.exists({ tokenHash, expiresAt });
    if (!exists) {
      return response.status(400).json({
        error: {
          code: 'RESET_LINK_INVALID',
          message: 'This reset link is invalid or expired. Request a new one.',
        },
      });
    }

    const passwordHash = await hashPassword(password);
    const reset = await PasswordResetToken.findOneAndDelete({ tokenHash, expiresAt });
    if (!reset) {
      return response.status(400).json({
        error: {
          code: 'RESET_LINK_INVALID',
          message: 'This reset link is invalid or expired. Request a new one.',
        },
      });
    }
    const updated = await User.updateOne({ _id: reset.userId }, { $set: { passwordHash } });
    if (!updated.matchedCount) {
      return response.status(400).json({
        error: {
          code: 'RESET_LINK_INVALID',
          message: 'This reset link is invalid or expired. Request a new one.',
        },
      });
    }
    await Promise.all([
      Session.deleteMany({ userId: reset.userId }),
      PasswordResetToken.deleteMany({ userId: reset.userId }),
    ]);
    clearSessionCookie(response, production);
    response.json({ message: 'Password updated. Sign in with your new password.' });
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
