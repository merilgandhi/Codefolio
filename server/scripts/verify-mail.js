import 'dotenv/config';
import { createContactMailer } from '../mail/contactMailer.js';

const mailer = createContactMailer(
  process.argv.includes('--starttls') ? { ...process.env, SMTP_PORT: '587' } : process.env,
);
if (!mailer.configured) {
  console.error('Mail is not configured. Set SMTP_USER and SMTP_PASS in the local .env file.');
  process.exitCode = 1;
} else {
  try {
    await mailer.verify();
    console.log(
      'PASS: SMTP connection, TLS and authentication verified. No email was sent. Inbox delivery still needs a contact-form test.',
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
      error.code === 'EAUTH'
        ? 'SMTP authentication failed. Check the Gmail address and App Password.'
        : `SMTP connection failed (${code}). Check the mail settings and network access.`,
    );
    process.exitCode = 1;
  }
}
