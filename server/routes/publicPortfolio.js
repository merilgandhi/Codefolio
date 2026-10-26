import { readFile } from 'node:fs/promises';
import { Router } from 'express';
import { User } from '../models/User.js';
import { toPublicPortfolio } from '../serializers/publicPortfolio.js';
import { publicUsername } from '../../shared/publicRoutes.js';
import { publicPageMetadata } from '../../shared/seo.js';
import { withDocumentMetadata } from '../seo.js';

export const PUBLIC_DATA_ID = 'codefolio-public-data';
const unavailable = {
  code: 'PORTFOLIO_UNAVAILABLE',
  message: 'Portfolios are temporarily unavailable. Please try again.',
};
const missing = { code: 'PORTFOLIO_NOT_FOUND', message: 'This portfolio could not be found.' };

export async function findPublicUser(username) {
  return User.findOne({ username })
    .select('username templateId tier profile projects skills -_id')
    .lean()
    .maxTimeMS(5000);
}

export function createPublicLookup({ getDatabaseStatus, findUser = findPublicUser }) {
  return async (value) => {
    const username = publicUsername(value);
    if (!username) return { status: 404, username: null, error: missing };
    if (getDatabaseStatus() !== 'connected') return { status: 503, username, error: unavailable };
    try {
      const user = await findUser(username);
      return user
        ? { status: 200, username, portfolio: toPublicPortfolio(user) }
        : { status: 404, username, error: missing };
    } catch {
      return { status: 503, username, error: unavailable };
    }
  };
}

export function createPublicApiRouter(lookup) {
  const router = Router();
  router.get('/:username', async (request, response) => {
    const result = await lookup(request.params.username);
    response
      .set('Cache-Control', 'no-store')
      .status(result.status)
      .json(result.portfolio ? { portfolio: result.portfolio } : { error: result.error });
  });
  return router;
}

export function serializePublicData(result) {
  return JSON.stringify(result).replace(
    /[<>&\u2028\u2029]/g,
    (character) => `\\u${character.charCodeAt(0).toString(16).padStart(4, '0')}`,
  );
}

export function createFrontendReader(production) {
  return async (pathname = '/') => {
    if (production) return readFile(new URL('../../dist/index.html', import.meta.url), 'utf8');
    // Fixed local origin, never a request-controlled Host or URL. /index.html bypasses the public proxy.
    const response = await fetch('http://127.0.0.1:5174/index.html', {
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) throw new Error('Frontend unavailable');
    const html = await response.text();
    // Also allows a document requested directly on the API port to load Vite's modules.
    const safePath = pathname === '/' || publicUsername(pathname.slice(1)) ? pathname : '/';
    return html.replace('<head>', `<head><base href="http://127.0.0.1:5174${safePath}">`);
  };
}

export function createPublicDocumentHandler({ lookup, getFrontendHtml, production }) {
  return async (request, response) => {
    const result = await lookup(request.params.username);
    response.set('Cache-Control', 'no-store');
    if (result.status === 200) {
      const canonical = `/${result.username}`;
      const requestedPath = request.originalUrl.split('?')[0];
      if (requestedPath !== canonical) {
        const query = request.originalUrl.includes('?')
          ? request.originalUrl.slice(request.originalUrl.indexOf('?'))
          : '';
        return response.redirect(308, canonical + query);
      }
    }
    try {
      const html = withDocumentMetadata(
        await getFrontendHtml(result.username ? `/${result.username}` : '/'),
        publicPageMetadata(result),
      );
      if (!production) response.removeHeader('Content-Security-Policy');
      return response
        .status(result.status)
        .type('html')
        .send(
          html.replace(
            '</body>',
            `<script type="application/json" id="${PUBLIC_DATA_ID}">${serializePublicData(result)}</script></body>`,
          ),
        );
    } catch {
      return response
        .status(503)
        .type('html')
        .send(
          '<!doctype html><html lang="en"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex, nofollow"><title>CodeFolio unavailable</title><main><h1>CodeFolio is temporarily unavailable</h1><p>Please try again in a moment.</p><a href="/">Return home</a></main></html>',
        );
    }
  };
}
