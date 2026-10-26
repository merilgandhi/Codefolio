import test from 'node:test';
import assert from 'node:assert/strict';
import net from 'node:net';
import nodemailer from 'nodemailer';
import { createApp } from '../app.js';
import { createContactMailer, readMailConfig } from '../mail/contactMailer.js';
import { isContactEmail, validateContact } from '../../shared/contact.js';

const valid = {
  name: 'Visitor',
  email: 'visitor@example.com',
  subject: 'A project opportunity',
  message: 'I would like to discuss a project with you.',
  website: '',
};
const owner = {
  username: 'test-coder',
  email: 'private-owner@example.invalid',
  profile: { name: 'Test Coder' },
};
const headers = { 'Content-Type': 'application/json', 'X-Codefolio-Request': '1' };
async function withServer(run, options = {}) {
  const deliveries = [];
  const server = createApp({
    getDatabaseStatus: () => 'connected',
    findContactOwner: async (username) =>
      username === 'test-coder'
        ? owner
        : username === 'other-coder'
          ? { ...owner, username, email: 'other-private@example.invalid' }
          : null,
    contactMailer: {
      configured: true,
      send: async (value) => {
        deliveries.push(value);
      },
    },
    ...options,
  }).listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const post = (body = valid, path = '/api/contact/test-coder', options = {}) =>
    fetch(base + path, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      ...options,
      signal: AbortSignal.timeout(10000),
    });
  try {
    await run(post, deliveries, base);
  } finally {
    await new Promise((resolve) => {
      server.close(resolve);
      server.closeAllConnections();
    });
  }
}

test('contact validation normalizes values and rejects unsafe headers, recipient lists and unsupported fields', () => {
  assert.deepEqual(
    validateContact({ ...valid, name: ' Visitor ', message: '\nA multi-line\nproject enquiry.\n' })
      .contact,
    {
      name: 'Visitor',
      email: valid.email,
      subject: valid.subject,
      message: 'A multi-line\nproject enquiry.',
    },
  );
  for (const email of [
    'a@b.com,other@b.com',
    'A <a@b.com>',
    'a@b.com\r\nBcc: x@y.com',
    '.a@b.com',
    'a..b@c.com',
    'a@-b.com',
    'not-an-email',
  ])
    assert.equal(isContactEmail(email), false);
  for (const input of [
    null,
    [],
    { ...valid, to: 'attacker@example.com' },
    { ...valid, from: 'spoof@example.com' },
    { ...valid, attachments: [] },
    { ...valid, message: { path: '.env' } },
    { ...valid, name: 'Visitor\r\nBcc: x@y.com' },
    { ...valid, subject: 'Hello\nBcc: x@y.com' },
    { ...valid, message: 'too short' },
    { ...valid, message: 'x'.repeat(3001) },
  ])
    assert.ok(Object.keys(validateContact(input).fields).length);
  assert.equal(
    Object.keys(
      validateContact({
        ...valid,
        message: '<script>plain message</script>\nNo HTML template is used.',
      }).fields,
    ).length,
    0,
  );
});

test('SMTP configuration requires credentials and safe sender; Gmail TLS and STARTTLS stay enforced', () => {
  assert.equal(readMailConfig({}), null);
  assert.equal(
    readMailConfig({
      SMTP_USER: 'sender@gmail.com',
      SMTP_PASS: 'secret',
      SMTP_FROM: 'one@x.com,two@x.com',
    }),
    null,
  );
  assert.equal(
    readMailConfig({ SMTP_USER: 'sender@gmail.com', SMTP_PASS: 'secret', SMTP_PORT: '25' }),
    null,
  );
  const gmail = readMailConfig({ SMTP_USER: 'sender@gmail.com', SMTP_PASS: 'secret' });
  assert.equal(gmail.host, 'smtp.gmail.com');
  assert.equal(gmail.secure, true);
  assert.equal(gmail.from, 'sender@gmail.com');
  const starttls = readMailConfig({
    SMTP_USER: 'sender@gmail.com',
    SMTP_PASS: 'secret',
    SMTP_PORT: '587',
  });
  assert.equal(starttls.requireTLS, true);
  assert.equal(starttls.secure, false);
});

test('mailer fixes sender and envelope recipient, uses visitor Reply-To and refuses unaccepted delivery', async () => {
  let options, message;
  const mailer = createContactMailer(
    { SMTP_USER: 'sender@gmail.com', SMTP_PASS: 'secret' },
    (value) => {
      options = value;
      return {
        verify: async () => true,
        sendMail: async (value) => {
          message = value;
          return { accepted: [owner.email], rejected: [] };
        },
      };
    },
  );
  await mailer.send({ owner, contact: valid });
  assert.deepEqual(message.envelope, { from: 'sender@gmail.com', to: [owner.email] });
  assert.deepEqual(message.replyTo, { name: 'Visitor', address: valid.email });
  assert.equal(message.from.address, 'sender@gmail.com');
  assert.ok(message.html.includes('NEW PORTFOLIO ENQUIRY'));
  assert.ok(message.html.includes('Reply to enquiry'));
  assert.ok(message.text.includes(valid.message));
  assert.equal(message.attachments, undefined);
  assert.equal(options.disableFileAccess, true);
  assert.equal(options.disableUrlAccess, true);
  assert.equal(options.maxRecipients, 1);
  assert.equal(options.logger, false);
  const bad = createContactMailer({ SMTP_USER: 'sender@gmail.com', SMTP_PASS: 'secret' }, () => ({
    sendMail: async () => ({ accepted: [], rejected: [owner.email] }),
  }));
  await assert.rejects(() => bad.send({ owner, contact: valid }));
});

test('anonymous contact requests resolve the selected owner on the server and disclose no private fields', () =>
  withServer(async (post, deliveries) => {
    for (const username of ['test-coder', 'other-coder']) {
      const response = await post(valid, `/api/contact/${username}`);
      assert.equal(response.status, 200);
      assert.equal(response.headers.get('cache-control'), 'no-store');
      const body = await response.text();
      for (const secret of [owner.email, 'other-private@example.invalid', 'passwordHash', 'token'])
        assert.ok(!body.includes(secret));
    }
    assert.equal(deliveries.length, 2);
    assert.equal(deliveries[0].owner.email, owner.email);
    assert.equal(deliveries[1].owner.email, 'other-private@example.invalid');
    assert.deepEqual(deliveries[0].contact, {
      name: valid.name,
      email: valid.email,
      subject: valid.subject,
      message: valid.message,
    });
  }));

test('contact rejects cross-site, unmarked, non-JSON, injected and malformed requests without sending', () =>
  withServer(async (post, deliveries) => {
    assert.equal(
      (
        await post(valid, undefined, {
          headers: { ...headers, Origin: 'https://attacker.example' },
        })
      ).status,
      403,
    );
    assert.equal(
      (await post(valid, undefined, { headers: { ...headers, 'Sec-Fetch-Site': 'cross-site' } }))
        .status,
      403,
    );
    assert.equal(
      (await post(valid, undefined, { headers: { 'Content-Type': 'application/json' } })).status,
      403,
    );
    assert.equal(
      (await post(valid, undefined, { headers: { ...headers, 'Content-Type': 'text/plain' } }))
        .status,
      415,
    );
    assert.equal((await post({ ...valid, to: 'other@example.com' })).status, 400);
    assert.equal((await post({ ...valid, message: '' })).status, 400);
    assert.equal((await post(valid, '/api/contact/admin')).status, 404);
    assert.equal(deliveries.length, 0);
  }));

test('contact returns sanitized failures for unconfigured mail, database outages and SMTP/lookup failures', async () => {
  for (const options of [
    { contactMailer: { configured: false } },
    { getDatabaseStatus: () => 'disconnected' },
    {
      findContactOwner: async () => {
        throw new Error('Mongo secret');
      },
    },
    {
      contactMailer: {
        configured: true,
        send: async () => {
          throw new Error(`SMTP ${owner.email} secret password`);
        },
      },
    },
    { findContactOwner: async () => ({ ...owner, email: 'two@x.com,three@x.com' }) },
  ])
    await withServer(async (post) => {
      const response = await post();
      assert.equal(response.status, 503);
      const content = await response.text();
      assert.ok(content.includes('temporarily unavailable'));
      assert.ok(!content.includes(owner.email));
      assert.ok(!content.includes('secret'));
    }, options);
  await withServer(async (post, deliveries) => {
    assert.equal((await post(valid, '/api/contact/missing-coder')).status, 404);
    assert.equal(deliveries.length, 0);
  });
});

test('contact rate limits bound IP, recipient and total requests; honeypot requests never send', async () => {
  for (const limits of [
    { ip: 2, recipient: 20, global: 100 },
    { ip: 20, recipient: 2, global: 100 },
    { ip: 20, recipient: 20, global: 2 },
  ])
    await withServer(
      async (post, deliveries) => {
        assert.equal((await post()).status, 200);
        assert.equal((await post()).status, 200);
        const limited = await post();
        assert.equal(limited.status, 429);
        assert.ok(limited.headers.get('retry-after'));
        assert.equal(deliveries.length, 2);
      },
      { contactLimits: limits },
    );
  await withServer(async (post, deliveries) => {
    assert.equal((await post({ ...valid, website: 'https://spam.example' })).status, 200);
    assert.equal(deliveries.length, 0);
  });
});

test(
  'Nodemailer sends the actual SMTP message to the selected private recipient and handles SMTP rejection',
  { timeout: 20000 },
  async () => {
    const messages = [],
      sockets = new Set();
    let reject = false;
    const smtp = net
      .createServer((socket) => {
        sockets.add(socket);
        socket.on('close', () => sockets.delete(socket));
        socket.on('error', () => {});
        socket.setEncoding('utf8');
        socket.write('220 localhost Test SMTP\r\n');
        let buffer = '',
          data = false,
          message = [],
          recipient = '';
        socket.on('data', (chunk) => {
          buffer += chunk;
          while (buffer.includes('\r\n')) {
            const end = buffer.indexOf('\r\n'),
              line = buffer.slice(0, end);
            buffer = buffer.slice(end + 2);
            if (data) {
              if (line === '.') {
                messages.push({ recipient, text: message.join('\n') });
                data = false;
                message = [];
                socket.write('250 queued\r\n');
              } else message.push(line.replace(/^\.\./, '.'));
              continue;
            }
            if (/^(EHLO|HELO)/.test(line)) socket.write('250-localhost\r\n250 SIZE 100000\r\n');
            else if (/^MAIL FROM:/.test(line)) socket.write('250 sender ok\r\n');
            else if (/^RCPT TO:/.test(line)) {
              recipient = line.slice(8).trim();
              socket.write(reject ? '550 recipient rejected\r\n' : '250 recipient ok\r\n');
            } else if (line === 'DATA') {
              data = true;
              socket.write('354 send data\r\n');
            } else if (line === 'QUIT') socket.end('221 bye\r\n');
            else socket.write('250 ok\r\n');
          }
        });
      })
      .listen(0, '127.0.0.1');
    await new Promise((resolve) => smtp.once('listening', resolve));
    // Plaintext is restricted to this isolated loopback fixture, never the app transport.
    const mailer = createContactMailer(
      { SMTP_USER: 'sender@gmail.com', SMTP_PASS: 'fixture-only' },
      (options) =>
        nodemailer.createTransport({
          ...options,
          host: '127.0.0.1',
          port: smtp.address().port,
          secure: false,
          requireTLS: false,
          ignoreTLS: true,
          auth: undefined,
        }),
    );
    try {
      await withServer(
        async (post) => {
          assert.equal((await post()).status, 200);
          assert.equal(messages.length, 1);
          assert.equal(messages[0].recipient, `<${owner.email}>`);
          assert.match(messages[0].text, /From: CodeFolio <sender@gmail.com>/);
          assert.match(messages[0].text, /Reply-To: Visitor <visitor@example.com>/);
          assert.match(messages[0].text, /Content-Type: multipart\/alternative/);
          const boundary = messages[0].text.match(/boundary="([^"]+)"/)[1];
          const plainPart = messages[0].text
            .split(`--${boundary}`)
            .find((part) => /Content-Type: text\/plain;/i.test(part));
          assert.ok(plainPart, 'A plain-text fallback must reach the SMTP server.');
          const split = plainPart.indexOf('\n\n');
          const partHeaders = plainPart.slice(0, split);
          const body = plainPart.slice(split + 2);
          const decoded = /Content-Transfer-Encoding: base64/i.test(partHeaders)
            ? Buffer.from(body.replace(/\s/g, ''), 'base64').toString('utf8')
            : /Content-Transfer-Encoding: quoted-printable/i.test(partHeaders)
              ? Buffer.from(
                  body
                    .replace(/=\n/g, '')
                    .replace(/=([a-f0-9]{2})/gi, (_match, hex) =>
                      String.fromCharCode(Number.parseInt(hex, 16)),
                    ),
                  'latin1',
                ).toString('utf8')
              : body;
          assert.ok(decoded.includes(valid.message));
          reject = true;
          const response = await post();
          assert.equal(response.status, 503);
          assert.ok(!(await response.text()).includes(owner.email));
          assert.equal(messages.length, 1);
        },
        { contactMailer: mailer },
      );
    } finally {
      for (const socket of sockets) socket.destroy();
      await new Promise((resolve) => smtp.close(resolve));
    }
  },
);
