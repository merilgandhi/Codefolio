import nodemailer from 'nodemailer';

const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
const SEND_ENDPOINT = 'https://gmail.googleapis.com/gmail/v1/users/me/messages/send';

export function createGmailApiTransport(
  config,
  fetchImpl = globalThis.fetch,
  createTransport = nodemailer.createTransport,
) {
  const composer = createTransport({
    streamTransport: true,
    buffer: true,
    newline: 'windows',
    disableFileAccess: true,
    disableUrlAccess: true,
    maxRecipients: 1,
    logger: false,
    debug: false,
  });
  let accessToken = '';
  let accessTokenExpiresAt = 0;
  let refreshInFlight;

  async function getAccessToken() {
    if (accessToken && Date.now() < accessTokenExpiresAt - 60_000) return accessToken;
    if (!refreshInFlight) {
      refreshInFlight = (async () => {
        const response = await fetchImpl(TOKEN_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Cache-Control': 'no-store',
          },
          body: new URLSearchParams({
            client_id: config.clientId,
            client_secret: config.clientSecret,
            refresh_token: config.refreshToken,
            grant_type: 'refresh_token',
          }),
          signal: AbortSignal.timeout(10_000),
        });
        const result = await response.json().catch(() => null);
        if (!response.ok || !result?.access_token)
          throw new Error('Gmail authorization could not be refreshed.');
        accessToken = result.access_token;
        accessTokenExpiresAt = Date.now() + Math.max(60, Number(result.expires_in) || 3600) * 1000;
        return accessToken;
      })().finally(() => {
        refreshInFlight = undefined;
      });
    }
    return refreshInFlight;
  }

  async function sendRaw(raw, mayRefresh = true) {
    const response = await fetchImpl(SEND_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${await getAccessToken()}`,
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      },
      body: JSON.stringify({ raw }),
      signal: AbortSignal.timeout(10_000),
    });
    if (response.status === 401 && mayRefresh) {
      accessToken = '';
      accessTokenExpiresAt = 0;
      return sendRaw(raw, false);
    }
    const result = await response.json().catch(() => null);
    if (!response.ok || !result?.id) throw new Error('Gmail did not accept the email.');
    return result.id;
  }

  return {
    verify: getAccessToken,
    async send(message) {
      const composed = await composer.sendMail({
        from: { name: 'CodeFolio', address: config.from },
        to: { address: message.to },
        ...(message.replyTo ? { replyTo: message.replyTo } : {}),
        subject: message.subject,
        html: message.html,
        text: message.text,
        disableFileAccess: true,
        disableUrlAccess: true,
      });
      if (!Buffer.isBuffer(composed.message))
        throw new Error('Nodemailer did not produce the email message.');
      return sendRaw(composed.message.toString('base64url'));
    },
  };
}
