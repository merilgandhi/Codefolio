import { createServer } from 'node:http';
import { mkdir, writeFile } from 'node:fs/promises';
import { renderContactEmail } from '../mail/contactEmail.js';

const content = renderContactEmail({
  owner: { username: 'meril007', profile: { name: 'Meril Gandhi' } },
  contact: {
    name: 'Alex Morgan',
    email: 'alex.morgan@example.com',
    subject: 'Let’s collaborate on a developer platform',
    message:
      'Hi Meril,\n\nI came across your portfolio and really liked your approach to full-stack development. We’re building a new developer platform at Studio North and would love to explore working together.\n\nAre you available for a short conversation this week?\n\nBest,\nAlex',
  },
});
await mkdir(new URL('../../artifacts/email-preview/', import.meta.url), { recursive: true });
await writeFile(
  new URL('../../artifacts/email-preview/contact.html', import.meta.url),
  content.html,
);
await writeFile(
  new URL('../../artifacts/email-preview/contact.txt', import.meta.url),
  content.text,
);
const server = createServer((request, response) => {
  response.setHeader('Cache-Control', 'no-store');
  if (request.url === '/')
    response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }).end(content.html);
  else if (request.url === '/plain-text')
    response.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' }).end(content.text);
  else response.writeHead(404).end('Not found');
}).listen(0, '127.0.0.1', () =>
  console.log(
    `Email preview: http://127.0.0.1:${server.address().port} (fictional enquiry; no email is sent)`,
  ),
);
process.once('SIGINT', () => server.close());
process.once('SIGTERM', () => server.close());
