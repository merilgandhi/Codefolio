import 'dotenv/config';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { readFile, writeFile, unlink } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import express from 'express';
import mongoose from 'mongoose';
import nodemailer from 'nodemailer';
import { createApp } from '../app.js';
import { createContactMailer } from '../mail/contactMailer.js';
import { hashPassword } from '../auth/passwords.js';
import { SESSION_COOKIE } from '../auth/sessions.js';
import { User } from '../models/User.js';
import { Session } from '../models/Session.js';
import { changeAccountTier } from '../plans/changeTier.js';
import { checkPlans } from './check-plans.js';
import { checkDomains } from './check-domains.js';

const control = new URL('../../.polish-qa-control', import.meta.url);
const ids = [new mongoose.Types.ObjectId(), new mongoose.Types.ObjectId()];
const suffix = randomBytes(4).toString('hex');
const usernames = ['bento', 'split'].map((layout) => `polish-${layout}-${suffix}`);
const password = `Temporary polish ${randomBytes(12).toString('hex')}`;
const qaCookie = 'codefolio_polish_session';
const contactMode = process.argv.includes('--contact');
const domainMode = process.argv.includes('--domains');
const planMode = process.argv.includes('--plans') || domainMode;
let contactState = 'ready';
const capturedMessages = [];
// Browser tests serialize mail locally and never contact an external mail server.
const capturedTransport = nodemailer.createTransport({
  streamTransport: true,
  buffer: true,
  newline: 'unix',
});
const capturedMailer = createContactMailer(
  { SMTP_USER: 'qa-sender@example.invalid', SMTP_PASS: 'fixture-only' },
  () => ({
    async sendMail(message) {
      if (contactState === 'fail') throw new Error('Test SMTP failure');
      if (contactState === 'slow') await new Promise((resolve) => setTimeout(resolve, 1800));
      const result = await capturedTransport.sendMail(message);
      capturedMessages.push({
        recipient: result.envelope.to[0],
        replyTo: message.replyTo.address,
        subject: message.subject,
      });
      console.log(`CONTACT_CAPTURE ${JSON.stringify(capturedMessages.at(-1))}`);
      return { ...result, accepted: result.envelope.to, rejected: [] };
    },
  }),
);
const svg =
  '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="750" viewBox="0 0 1200 750"><rect width="1200" height="750" fill="#f3f0fa"/><rect x="70" y="65" width="1060" height="620" rx="24" fill="#fff" stroke="#dedbe6" stroke-width="3"/><rect x="115" y="115" width="260" height="34" rx="8" fill="#7357b9"/><rect x="115" y="200" width="600" height="160" rx="16" fill="#e9e2f5"/><rect x="750" y="200" width="330" height="360" rx="16" fill="#f3f0fa"/><rect x="115" y="400" width="280" height="160" rx="16" fill="#f3f0fa"/><rect x="435" y="400" width="280" height="160" rx="16" fill="#f3f0fa"/></svg>';
let server,
  base,
  ownsControl = false,
  created = false,
  stopping = false,
  imagesReleased = false;
const pendingImages = new Set();
process.on('SIGINT', () => {
  stopping = true;
});
const connect = () =>
  mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 7000,
    socketTimeoutMS: 10000,
    autoIndex: false,
  });
function content(index, mode) {
  const name = index ? 'Jordan Rivera' : 'Avery Chen';
  const complete = mode !== 'empty';
  const long = mode === 'long';
  const projects = complete
    ? Array.from({ length: 4 }, (_, i) => ({
        title: long
          ? `Project${'X'.repeat(113)}`
          : ['Accessible Workspace', 'API Monitor', 'Developer Toolkit', 'Release Planner'][i],
        description: long
          ? 'DetailedDevelopmentWork'.repeat(150).slice(0, 3000)
          : 'A focused tool for teams building thoughtful interfaces and dependable developer services.',
        techStack: long
          ? Array.from({ length: 20 }, (_, n) => `Technology${n}${'T'.repeat(37)}`)
          : ['React', 'Tailwind CSS', 'Node.js'],
        repoLink: 'https://github.com/',
        liveLink: 'https://example.com/',
        screenshot:
          i === 2
            ? ''
            : `${base}/qa-assets/${i === 1 ? 'missing.png' : mode === 'slow' && i === 0 ? 'slow.svg' : 'screenshot.svg'}?project=${i}`,
      }))
    : [];
  return {
    profile: {
      name: long ? 'Developer'.repeat(12).slice(0, 100) : name,
      bio: complete
        ? long
          ? 'ThoughtfulDeveloper'.repeat(120).slice(0, 2000)
          : 'Full-stack developer creating accessible interfaces and dependable APIs. I turn complex ideas into useful experiences.'
        : '',
      resumeUrl: complete ? 'https://example.com/resume.pdf' : '',
      socialLinks: complete
        ? Array.from({ length: long ? 10 : 2 }, (_, i) => ({
            label: long ? 'ProfessionalProfile'.repeat(3).slice(0, 40) : i ? 'LinkedIn' : 'GitHub',
            url: i ? 'https://www.linkedin.com/' : 'https://github.com/',
          }))
        : [],
    },
    projects,
    skills: Object.fromEntries(
      ['frontend', 'backend', 'devops'].map((category, i) => [
        category,
        complete
          ? long
            ? Array.from({ length: 40 }, (_, n) => `${category}${n}${'S'.repeat(40)}`.slice(0, 50))
            : [
                ['React', 'Tailwind CSS', 'TypeScript'],
                ['Node.js', 'Express', 'MongoDB'],
                ['Git', 'Docker'],
              ][i]
          : [],
      ]),
    ),
  };
}
async function setMode(mode) {
  for (let i = 0; i < ids.length; i++)
    await User.updateOne(
      { _id: ids[i] },
      { $set: content(i, mode), $inc: { __v: 1 } },
      { runValidators: true },
    );
  console.log(`POLISH_READY ${mode}`);
}
try {
  assert.ok(process.env.MONGODB_URI, 'Configure the local Atlas URI first.');
  await writeFile(control, 'ready', { flag: 'wx' });
  ownsControl = true;
  await connect();
  const app = express();
  // Isolate browser fixture sessions from the real user's localhost session.
  app.use((request, response, next) => {
    const value = request.headers.cookie
      ?.split(';')
      .map((v) => v.trim())
      .find((v) => v.startsWith(`${qaCookie}=`));
    request.headers.cookie = value ? `${SESSION_COOKIE}=${value.slice(qaCookie.length + 1)}` : '';
    const setHeader = response.setHeader.bind(response);
    response.setHeader = (name, value) =>
      setHeader(
        name,
        name.toLowerCase() === 'set-cookie'
          ? (Array.isArray(value) ? value : [value]).map((v) =>
              String(v).replace(`${SESSION_COOKIE}=`, `${qaCookie}=`),
            )
          : value,
      );
    next();
  });
  app.get('/qa-assets/screenshot.svg', (_request, response) => response.type('svg').send(svg));
  app.get('/qa-assets/slow.svg', (_request, response) => {
    if (imagesReleased) return response.type('svg').send(svg);
    pendingImages.add(response);
    response.on('close', () => pendingImages.delete(response));
  });
  app.get('/qa-assets/missing.png', (_request, response) => response.status(404).end());
  app.use('/assets', express.static(fileURLToPath(new URL('../../dist/assets', import.meta.url))));
  app.use(
    '/theme-init.js',
    express.static(fileURLToPath(new URL('../../public/theme-init.js', import.meta.url))),
  );
  const origins = [];
  app.use(
    createApp({
      getDatabaseStatus: () =>
        mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
      origins,
      contactMailer: contactMode ? capturedMailer : { configured: false },
      getFrontendHtml: () => readFile(new URL('../../dist/index.html', import.meta.url), 'utf8'),
    }),
  );
  server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
  origins.push(base);
  const passwordHash = await hashPassword(password);
  created = true;
  for (let i = 0; i < ids.length; i++)
    await User.create({
      _id: ids[i],
      username: usernames[i],
      email: `${usernames[i]}@example.invalid`,
      passwordHash,
      templateId: i ? 'split-screen' : 'bento',
      ...(planMode ? { tier: i ? 'pro' : 'free' } : {}),
      ...content(i, 'complete'),
    });
  if (domainMode) await checkDomains({ base, ids, usernames, password });
  else if (planMode) await checkPlans({ base, ids, usernames, password });
  console.log(
    `BROWSER_POLISH ${JSON.stringify({ base, usernames, fixtureEmail: `${usernames[0]}@example.invalid`, fixturePassword: password })}`,
  );
  let previous = 'ready';
  while (!stopping && !process.argv.includes('--once')) {
    await new Promise((resolve) => setTimeout(resolve, 250));
    const command = (await readFile(control, 'utf8')).trim();
    if (command === previous) continue;
    previous = command;
    if (command === 'cleanup') break;
    if (['complete', 'empty', 'long', 'slow'].includes(command)) {
      if (command === 'slow') imagesReleased = false;
      await setMode(command);
    } else if (command === 'images-ready') {
      imagesReleased = true;
      for (const response of pendingImages) response.type('svg').send(svg);
      pendingImages.clear();
      console.log('POLISH_READY images-ready');
    } else if (contactMode && ['contact-ready', 'contact-fail', 'contact-slow'].includes(command)) {
      contactState = command.replace('contact-', '');
      console.log(`POLISH_READY ${command}`);
    } else if (planMode && /^plan-(promote|demote)-[ab]$/.test(command)) {
      const index = command.endsWith('-a') ? 0 : 1;
      const tier = command.includes('-promote-') ? 'pro' : 'free';
      await changeAccountTier(usernames[index], tier, { apply: true });
      console.log(`PLAN_READY ${usernames[index]} ${tier}`);
    } else if (contactMode && command === 'contact-count')
      console.log(`CONTACT_COUNT ${capturedMessages.length}`);
    else console.log('Unknown polish command.');
  }
} catch (error) {
  console.error(`FAIL: Polish fixture setup (${error.name}). Connection strings are not logged.`);
  process.exitCode = 1;
} finally {
  if (server)
    await new Promise((resolve) => {
      server.close(resolve);
      server.closeAllConnections();
    });
  if (created) {
    try {
      if (mongoose.connection.readyState !== 1) await connect();
      await Session.deleteMany({ userId: { $in: ids } });
      await User.deleteMany({ _id: { $in: ids } });
      assert.equal(await User.countDocuments({ _id: { $in: ids } }), 0);
      assert.equal(await Session.countDocuments({ userId: { $in: ids } }), 0);
      console.log('PASS: Exactly the two polish fixture accounts and their sessions were removed.');
    } catch {
      console.error('FAIL: Polish fixture cleanup requires attention.');
      process.exitCode = 1;
    }
  }
  await mongoose.disconnect();
  if (ownsControl) await unlink(control).catch(() => {});
}
