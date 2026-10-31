import 'dotenv/config';
import { createHash, randomBytes } from 'node:crypto';
import { createServer } from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const clientId = process.env.GMAIL_CLIENT_ID?.trim() || '';
const clientSecret = process.env.GMAIL_CLIENT_SECRET || '';
const sender = process.env.GMAIL_USER?.trim() || '';
const port = Number(process.env.GMAIL_OAUTH_CALLBACK_PORT || 48123);
const envFile = resolve('.env');
if (
  !clientId ||
  !clientSecret ||
  !sender ||
  !Number.isInteger(port) ||
  port < 1024 ||
  port > 65535
) {
  console.error(
    'Add GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET and GMAIL_USER to the local .env file first.',
  );
  process.exitCode = 1;
} else {
  const redirectUri = `http://127.0.0.1:${port}/oauth2/callback`;
  const state = randomBytes(32).toString('base64url');
  const verifier = randomBytes(48).toString('base64url');
  const challenge = createHash('sha256').update(verifier).digest('base64url');
  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.search = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'https://www.googleapis.com/auth/gmail.send',
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: 'true',
    login_hint: sender,
    state,
    code_challenge: challenge,
    code_challenge_method: 'S256',
  }).toString();

  const server = createServer(async (request, response) => {
    const callback = new URL(request.url || '/', redirectUri);
    if (callback.pathname !== '/oauth2/callback') {
      response.writeHead(404).end('Not found.');
      return;
    }
    if (callback.searchParams.get('state') !== state) {
      response.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
      response.end('OAuth state did not match. Close this tab and run the setup command again.');
      return;
    }
    const code = callback.searchParams.get('code');
    const authError = callback.searchParams.get('error');
    if (!code || authError) {
      response.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
      response.end('Google authorization was not completed. You can close this tab.');
      server.close();
      process.exitCode = 1;
      return;
    }

    try {
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Cache-Control': 'no-store',
        },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          code,
          code_verifier: verifier,
          grant_type: 'authorization_code',
          redirect_uri: redirectUri,
        }),
        signal: AbortSignal.timeout(15_000),
      });
      const tokenResult = await tokenResponse.json().catch(() => null);
      if (!tokenResponse.ok || !tokenResult?.refresh_token)
        throw new Error('Google did not return a refresh token.');

      const existingEnv = await readFile(envFile, 'utf8');
      const refreshLine = `GMAIL_REFRESH_TOKEN=${tokenResult.refresh_token}`;
      const updatedEnv = /^GMAIL_REFRESH_TOKEN=.*$/m.test(existingEnv)
        ? existingEnv.replace(/^GMAIL_REFRESH_TOKEN=.*$/m, refreshLine)
        : `${existingEnv.replace(/\s*$/, '')}\n${refreshLine}\n`;
      await writeFile(envFile, updatedEnv, 'utf8');
      response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      response.end('<p>Gmail authorization is complete. You can close this tab.</p>');
      console.log('GMAIL_REFRESH_TOKEN was saved to the ignored local .env file.');
    } catch {
      response.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      response.end('Token setup failed. Check the OAuth client settings and try again.');
      console.error('Gmail OAuth setup failed. No token values were printed.');
      process.exitCode = 1;
    } finally {
      server.close();
    }
  });

  server.on('error', () => {
    console.error(
      'Could not start the local OAuth callback. Choose another GMAIL_OAUTH_CALLBACK_PORT.',
    );
    process.exitCode = 1;
  });
  server.listen(port, '127.0.0.1', () => {
    console.log(
      'Open this URL, sign in to the Gmail account used by CodeFolio, and approve Gmail send access:',
    );
    console.log(authUrl.toString());
    console.log(
      'The one-time authorization code is exchanged locally and the refresh token is saved to .env.',
    );
  });
  const timeout = setTimeout(
    () => {
      console.error('OAuth setup timed out. Run the command again when ready.');
      server.close();
      process.exitCode = 1;
    },
    5 * 60 * 1000,
  );
  timeout.unref();
}
