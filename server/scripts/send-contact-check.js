import 'dotenv/config';
import { publicUsername } from '../../shared/publicRoutes.js';
import { isContactEmail } from '../../shared/contact.js';

const username = publicUsername(process.argv[2]);
const port = Number(process.env.PORT || 4000);
if (
  !username ||
  !process.argv.includes('--send') ||
  !isContactEmail(process.env.GMAIL_USER) ||
  !Number.isInteger(port) ||
  port < 1 ||
  port > 65535
) {
  console.error(
    'To send one real test email through the running local API, explicitly run: npm run verify:contact:delivery -- <username> --send',
  );
  process.exitCode = 1;
} else {
  try {
    const response = await fetch(`http://127.0.0.1:${port}/api/contact/${username}`, {
      method: 'POST',
      signal: AbortSignal.timeout(25000),
      headers: { 'Content-Type': 'application/json', 'X-Codefolio-Request': '1' },
      body: JSON.stringify({
        name: 'CodeFolio verification',
        email: process.env.GMAIL_USER,
        subject: 'CodeFolio contact-form delivery test',
        message: `This is the single CodeFolio contact-form test requested for @${username}. If you can read it, the delivery check worked. Please confirm receipt in the chat.`,
        website: '',
      }),
    });
    await response.text();
    if (!response.ok) throw new Error(`HTTP_${response.status}`);
    console.log(
      `PASS: One test message for @${username} was accepted for delivery through the contact API. Confirm it arrived in the registered inbox; API acceptance alone does not prove receipt.`,
    );
  } catch (error) {
    console.error(
      /^HTTP_\d+$/.test(error.message)
        ? `Contact test was not accepted (${error.message}).`
        : 'Contact test delivery could not be confirmed. Check the API and mail configuration before retrying.',
    );
    process.exitCode = 1;
  }
}
