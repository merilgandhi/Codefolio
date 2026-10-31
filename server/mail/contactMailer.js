import nodemailer from 'nodemailer';
import { isContactEmail } from '../../shared/contact.js';
import { renderContactEmail } from './contactEmail.js';
import { renderPasswordResetEmail } from './passwordResetEmail.js';

export function readMailConfig(env = process.env) {
  const host = env.SMTP_HOST?.trim() || 'smtp.gmail.com';
  const port = Number(env.SMTP_PORT || 465);
  const user = env.SMTP_USER?.trim() || '';
  const pass = env.SMTP_PASS || '';
  const from = env.SMTP_FROM?.trim() || user;
  if (
    !user ||
    !pass ||
    !isContactEmail(from) ||
    !/^[a-z0-9.-]+$/i.test(host) ||
    ![465, 587, 2587].includes(port)
  )
    return null;
  return { host, port, secure: port === 465, requireTLS: port !== 465, auth: { user, pass }, from };
}

export function createContactMailer(
  env = process.env,
  createTransport = nodemailer.createTransport,
) {
  const config = readMailConfig(env);
  if (!config) return { configured: false };
  const { from, ...options } = config;
  const transport = createTransport({
    ...options,
    connectionTimeout: 5000,
    greetingTimeout: 5000,
    socketTimeout: 10000,
    dnsTimeout: 5000,
    disableFileAccess: true,
    disableUrlAccess: true,
    maxRecipients: 1,
    logger: false,
    debug: false,
  });
  return {
    configured: true,
    verify: () => transport.verify(),
    async send({ owner, contact }) {
      const content = renderContactEmail({ owner, contact });
      const info = await transport.sendMail({
        from: { name: 'CodeFolio', address: from },
        to: { address: owner.email },
        replyTo: { name: contact.name, address: contact.email },
        envelope: { from, to: [owner.email] },
        subject: `CodeFolio: ${contact.subject}`,
        ...content,
        disableFileAccess: true,
        disableUrlAccess: true,
      });
      if (
        !info.accepted?.some(
          (address) => String(address).toLowerCase() === owner.email.toLowerCase(),
        ) ||
        info.rejected?.length
      )
        throw new Error('Contact delivery was not accepted.');
    },
    async sendPasswordReset({ email, resetUrl }) {
      if (!isContactEmail(email)) throw new Error('Password reset recipient is invalid.');
      const content = renderPasswordResetEmail({ resetUrl });
      const info = await transport.sendMail({
        from: { name: 'CodeFolio', address: from },
        to: { address: email },
        envelope: { from, to: [email] },
        subject: 'Reset your CodeFolio password',
        ...content,
        disableFileAccess: true,
        disableUrlAccess: true,
      });
      if (
        !info.accepted?.some((address) => String(address).toLowerCase() === email.toLowerCase()) ||
        info.rejected?.length
      )
        throw new Error('Password reset delivery was not accepted.');
    },
  };
}
