export const noStore = (_request, response, next) => {
  response.set('Cache-Control', 'no-store');
  next();
};

export function protectWrites(origins) {
  return (request, response, next) => {
    if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) return next();
    if (
      request.get('X-Codefolio-Request') !== '1' ||
      (request.get('Origin') && !origins.includes(request.get('Origin'))) ||
      request.get('Sec-Fetch-Site') === 'cross-site'
    ) {
      return response
        .status(403)
        .json({ error: { code: 'REQUEST_REJECTED', message: 'This request is not permitted.' } });
    }
    if (!request.is('application/json')) {
      return response
        .status(415)
        .json({ error: { code: 'JSON_REQUIRED', message: 'Send an application/json request.' } });
    }
    next();
  };
}

export function requireDatabase(getDatabaseStatus) {
  return (_request, response, next) => {
    if (getDatabaseStatus() !== 'connected') {
      return response.status(503).json({
        error: {
          code: 'DATABASE_UNAVAILABLE',
          message: 'Accounts are temporarily unavailable. Please try again shortly.',
        },
      });
    }
    next();
  };
}
