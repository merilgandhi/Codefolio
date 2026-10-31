import 'dotenv/config';
import { createContactMailer } from '../mail/contactMailer.js';

const mailer = createContactMailer(
  process.argv.includes('--starttls') ? { ...process.env, SMTP_PORT: '587' } : process.env,
);
if (!mailer.configured) {
  console.error(
    'Mail is not configured. Set GMAIL_USER, GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET and GMAIL_REFRESH_TOKEN, or local SMTP settings.',
  );
  process.exitCode = 1;
} else {
  try {
    await mailer.verify();
    console.log(
      mailer.provider === 'gmail-api'
        ? 'PASS: Gmail OAuth refresh succeeded. No email was sent. Inbox delivery still needs a contact-form check.'
        : 'PASS: SMTP connection, TLS and authentication verified. No email was sent. Inbox delivery still needs a contact-form check.',
    );
  } catch (error) {
    const code = [
      'EAUTH',
      'ETIMEOUT',
      'ESOCKET',
      'EDNS',
      'ECONNECTION',
      'ETLS',
      'ECONNREFUSED',
      'ENOTFOUND',
    ].includes(error.code)
      ? error.code
      : 'UNKNOWN';
    console.error(
      mailer.provider === 'gmail-api'
        ? 'Gmail OAuth check failed. Check the OAuth client and refresh token settings.'
        : error.code === 'EAUTH'
          ? 'SMTP authentication failed. Check the Gmail address and App Password.'
          : `SMTP connection failed (${code}). Check the mail settings and network access.`,
    );
    process.exitCode = 1;
  }
}
