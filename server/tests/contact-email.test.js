import test from 'node:test';
import assert from 'node:assert/strict';
import nodemailer from 'nodemailer';
import { renderContactEmail } from '../mail/contactEmail.js';

const owner = {
  username: 'meril007',
  profile: { name: 'Meril Gandhi' },
  email: 'private@example.invalid',
};
const contact = {
  name: 'Alex Morgan',
  email: 'alex@example.com',
  subject: 'Let’s collaborate on a developer platform',
  message: 'Hi Meril,\n\nI would love to discuss a project.\nAre you available this week?',
};

test('branded email contains all enquiry details, a reply link and a complete plain-text alternative', () => {
  const { html, text } = renderContactEmail({ owner, contact });
  for (const value of [
    contact.name,
    contact.email,
    contact.subject,
    '@meril007',
    'CodeFolio',
    'NEW PORTFOLIO ENQUIRY',
  ])
    assert.ok(html.includes(value));
  assert.ok(html.includes('mailto:alex%40example.com?subject=Re%3A%20'));
  assert.ok(html.includes('Are you available this week?'));
  assert.ok(text.includes(contact.message));
  assert.ok(!html.includes(owner.email));
  assert.ok(html.includes('max-width:640px'));
  assert.ok(html.includes('max-width:480px'));
  assert.ok(!/<img\b|<script\b|https?:\/\//i.test(html));
});

test('email escapes hostile content and encodes mailto addresses and subjects without header/link injection', () => {
  const { html } = renderContactEmail({
    owner: { ...owner, profile: { name: '<img src=x onerror=alert(1)>' } },
    contact: {
      ...contact,
      name: '<b>Alex & "Team"</b>',
      subject: '<script>bad</script> & deal',
      email: 'alex+tag?x=y@example.com',
      message:
        '<a href="https://evil.example">Do not render this link</a>\n\n<script>alert(1)</script>',
    },
  });
  assert.ok(!html.includes('<script>'));
  assert.ok(!html.includes('<img '));
  assert.ok(!html.includes('<b>Alex'));
  assert.ok(html.includes('&lt;script&gt;'));
  assert.ok(html.includes('&lt;a href='));
  assert.ok(html.includes('alex%2Btag%3Fx%3Dy%40example.com?subject='));
  const invalid = renderContactEmail({
    owner,
    contact: { ...contact, email: 'javascript:alert(1)' },
  }).html;
  assert.ok(!invalid.includes('href="javascript:'));
  assert.ok(!invalid.includes('href="mailto:'));
});

test('email preserves Unicode, paragraph breaks and maximum-length content without truncation', () => {
  const message = 'A'.repeat(1400) + '\n\nUnicode 👋 & development\n' + 'Z'.repeat(1500);
  const { html, text } = renderContactEmail({
    owner,
    contact: {
      ...contact,
      name: 'Developer'.repeat(11),
      subject: 'Opportunity'.repeat(10),
      message,
    },
  });
  assert.ok(text.includes(message));
  assert.ok(html.includes('A'.repeat(1400)));
  assert.ok(html.includes('Z'.repeat(1500)));
  assert.ok(html.includes('Unicode 👋 &amp; development<br>'));
  assert.ok(html.includes('overflow-wrap:anywhere'));
});

test('Nodemailer serializes the design and fallback as a multipart email', async () => {
  const transport = nodemailer.createTransport({ streamTransport: true, buffer: true });
  const info = await transport.sendMail({
    from: 'sender@example.invalid',
    to: 'receiver@example.invalid',
    subject: contact.subject,
    ...renderContactEmail({ owner, contact }),
  });
  const mime = info.message.toString();
  assert.match(mime, /Content-Type: multipart\/alternative/);
  assert.match(mime, /Content-Type: text\/plain; charset=utf-8/);
  assert.match(mime, /Content-Type: text\/html; charset=utf-8/);
});
