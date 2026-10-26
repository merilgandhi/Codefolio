import express from 'express';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { fileURLToPath } from 'node:url';
import { databaseStatus } from './db.js';
import { withDocumentMetadata } from './seo.js';
import { routeMetadata } from '../shared/seo.js';
import { createAuthRouter } from './routes/auth.js';
import { createProfileRouter } from './routes/profile.js';
import { createProjectsRouter } from './routes/projects.js';
import { createSkillsRouter } from './routes/skills.js';
import { createPortfolioPreviewRouter } from './routes/portfolioPreview.js';
import { createTemplateRouter } from './routes/template.js';
import { createContactRouter } from './routes/contact.js';
import { createContactMailer } from './mail/contactMailer.js';
import { createPlanRouter, createPremiumRouter } from './routes/plans.js';
import { createDomainRedirectRouter } from './routes/domains.js';
import {
  createPublicLookup,
  createPublicApiRouter,
  createPublicDocumentHandler,
  createFrontendReader,
} from './routes/publicPortfolio.js';

export function createApp({
  production = false,
  getDatabaseStatus = databaseStatus,
  origins = ['http://127.0.0.1:5174', 'http://localhost:5174'],
  trustProxy = false,
  findPublicUser,
  contactMailer = createContactMailer(),
  findContactOwner,
  findDomainOwner,
  contactLimits,
  getFrontendHtml = createFrontendReader(production),
} = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', trustProxy);
  app.use(
    helmet({ contentSecurityPolicy: { directives: { imgSrc: ["'self'", 'https:', 'http:'] } } }),
  );
  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());

  app.get('/api/health', (_request, response) => {
    response.set('Cache-Control', 'no-store');
    response.json({ status: 'ok', service: 'codefolio-api', database: getDatabaseStatus() });
  });

  app.use('/api/auth', createAuthRouter({ production, origins, getDatabaseStatus }));
  app.use('/api/profile', createProfileRouter({ production, origins, getDatabaseStatus }));
  app.use('/api/projects', createProjectsRouter({ production, origins, getDatabaseStatus }));
  app.use('/api/skills', createSkillsRouter({ production, origins, getDatabaseStatus }));
  app.use(
    '/api/portfolio/preview',
    createPortfolioPreviewRouter({ production, getDatabaseStatus }),
  );
  app.use('/api/template', createTemplateRouter({ production, origins, getDatabaseStatus }));
  app.use('/api/plan', createPlanRouter({ production, origins, getDatabaseStatus }));
  app.use('/api/pro', createPremiumRouter({ production, origins, getDatabaseStatus }));
  app.use(
    '/api/domains',
    createDomainRedirectRouter({ getDatabaseStatus, findOwner: findDomainOwner }),
  );
  const lookup = createPublicLookup({ getDatabaseStatus, findUser: findPublicUser });
  app.use('/api/portfolios', createPublicApiRouter(lookup));
  app.use(
    '/api/contact',
    createContactRouter({
      origins,
      getDatabaseStatus,
      mailer: contactMailer,
      findOwner: findContactOwner,
      limits: contactLimits,
    }),
  );

  app.use('/api', (_request, response) => {
    response.status(404).json({ error: { code: 'NOT_FOUND', message: 'API route not found.' } });
  });

  if (production) {
    const dist = fileURLToPath(new URL('../dist/', import.meta.url));
    app.use(express.static(dist, { index: false }));
  }

  app.get(['/', '/login', '/register', '/dashboard'], async (request, response) => {
    if (!production) response.removeHeader('Content-Security-Policy');
    response
      .set('Cache-Control', 'no-store')
      .type('html')
      .send(withDocumentMetadata(await getFrontendHtml(), routeMetadata(request.path)));
  });
  const publicDocument = createPublicDocumentHandler({ lookup, getFrontendHtml, production });
  app.get('/user/:username', publicDocument);
  app.get('/:username', publicDocument);
  app.get('/{*path}', (_request, response) =>
    response
      .status(404)
      .type('html')
      .send(
        '<!doctype html><html lang="en"><title>Page not found | CodeFolio</title><main><h1>Page not found</h1><a href="/">Return home</a></main></html>',
      ),
  );

  app.use((error, _request, response, _next) => {
    const status = error.status === 400 ? 400 : error.status === 413 ? 413 : 500;
    const message =
      status === 400
        ? 'Invalid JSON body.'
        : status === 413
          ? 'Request body too large.'
          : 'An unexpected error occurred.';
    response.status(status).json({ error: { code: 'REQUEST_ERROR', message } });
  });
  return app;
}
