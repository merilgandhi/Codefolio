import { createHash, randomBytes } from 'node:crypto';
import { Session } from '../models/Session.js';
import { User } from '../models/User.js';
import { resolveTemplateId } from '../../shared/portfolio.js';
import { normalizeTier } from '../../shared/plans.js';

export const SESSION_COOKIE = 'codefolio_session';
export const SESSION_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000;
export const digestToken = (token) => createHash('sha256').update(token).digest('hex');

export function cookieOptions(production) {
  return { httpOnly: true, secure: production, sameSite: 'lax', path: '/' };
}

export function accountResponse(user) {
  return {
    id: String(user._id),
    username: user.username,
    email: user.email,
    name: user.profile.name,
    tier: normalizeTier(user.tier),
    templateId: resolveTemplateId(user.templateId),
  };
}

export function clearSessionCookie(response, production) {
  response.clearCookie(SESSION_COOKIE, cookieOptions(production));
}

export async function issueSession(request, response, user, production) {
  const token = randomBytes(32).toString('hex');
  const session = await Session.create({
    tokenHash: digestToken(token),
    userId: user._id,
    expiresAt: new Date(Date.now() + SESSION_LIFETIME_MS),
  });
  try {
    const old = request.cookies?.[SESSION_COOKIE];
    if (typeof old === 'string' && /^[a-f0-9]{64}$/.test(old)) {
      await Session.deleteOne({ tokenHash: digestToken(old) });
    }
    response.cookie(SESSION_COOKIE, token, {
      ...cookieOptions(production),
      maxAge: SESSION_LIFETIME_MS,
    });
  } catch (error) {
    await Session.deleteOne({ _id: session._id });
    throw error;
  }
}

export function requireAccount(production) {
  return async (request, response, next) => {
    const token = request.cookies?.[SESSION_COOKIE];
    const deny = () => {
      clearSessionCookie(response, production);
      return response
        .status(401)
        .json({ error: { code: 'UNAUTHENTICATED', message: 'Please sign in to continue.' } });
    };
    if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) return deny();
    // MongoDB TTL cleanup is asynchronous, so expiration is checked on every request.
    const session = await Session.findOne({
      tokenHash: digestToken(token),
      expiresAt: { $gt: new Date() },
    });
    if (!session) return deny();
    const user = await User.findById(session.userId).select('+email');
    if (!user) {
      await Session.deleteOne({ _id: session._id });
      return deny();
    }
    request.account = user;
    request.authSession = session;
    next();
  };
}
