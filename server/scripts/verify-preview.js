import 'dotenv/config';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import mongoose from 'mongoose';
import { createApp } from '../app.js';
import { User } from '../models/User.js';
import { Session } from '../models/Session.js';
import { hashPassword } from '../auth/passwords.js';
import { digestToken, SESSION_COOKIE } from '../auth/sessions.js';
import { toPublicPortfolio } from '../serializers/publicPortfolio.js';

const ids = [new mongoose.Types.ObjectId(), new mongoose.Types.ObjectId()];
const suffix = randomBytes(6).toString('hex');
const tokens = ids.map(() => randomBytes(32).toString('hex'));
let server;
try {
  assert.ok(process.env.MONGODB_URI);
  await mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 10000,
    autoIndex: false,
  });
  const passwordHash = await hashPassword(`Temporary preview ${randomBytes(12).toString('hex')}`);
  for (let index = 0; index < ids.length; index++) {
    await User.create({
      _id: ids[index],
      username: `preview-${index}-${suffix}`,
      email: `preview-${index}-${suffix}@example.invalid`,
      passwordHash,
      profile: {
        name: `Preview owner ${index}`,
        bio: `Saved biography ${index}`,
        resumeUrl: 'https://example.com/resume.pdf',
        socialLinks: [{ label: 'GitHub', url: 'https://github.com/' }],
      },
      projects: [
        {
          title: `Saved project ${index}`,
          description: 'Database content.',
          techStack: ['React'],
          repoLink: 'https://github.com/',
          liveLink: 'https://example.com/',
          screenshot: 'https://example.com/project.png',
        },
      ],
      skills: { frontend: ['React'], backend: ['Express'], devops: ['Docker'] },
    });
    await Session.create({
      userId: ids[index],
      tokenHash: digestToken(tokens[index]),
      expiresAt: new Date(Date.now() + 60000),
    });
  }
  server = createApp({ getDatabaseStatus: () => 'connected' }).listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}/api/portfolio/preview`;
  const request = (index, path = '', options = {}) =>
    fetch(base + path, { headers: { Cookie: `${SESSION_COOKIE}=${tokens[index]}` }, ...options });
  const before = await User.find({ _id: { $in: ids } })
    .select('+email +passwordHash')
    .lean();
  for (let index = 0; index < ids.length; index++) {
    const response = await request(index);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    const data = await response.json();
    assert.deepEqual(Object.keys(data), ['portfolio']);
    const owner = await User.findById(ids[index]).select('+email +passwordHash');
    assert.deepEqual(data.portfolio, toPublicPortfolio(owner));
    assert.equal(data.portfolio.profile.bio, `Saved biography ${index}`);
    assert.equal(data.portfolio.projects[0].title, `Saved project ${index}`);
    for (const privateValue of [owner.email, owner.passwordHash, String(owner._id), tokens[index]])
      assert.ok(!JSON.stringify(data).includes(privateValue));
  }
  console.log(
    'PASS: Each signed-in account receives its own complete saved portfolio through the public-data allowlist.',
  );
  assert.equal((await fetch(base)).status, 401);
  for (const query of [`?userId=${ids[1]}`, `?username=preview-1-${suffix}`])
    assert.equal((await request(0, query)).status, 400);
  assert.equal((await request(0, `/${ids[1]}`)).status, 404);
  for (const method of ['POST', 'PUT', 'DELETE'])
    assert.equal((await request(0, '', { method })).status, 404);
  assert.deepEqual(
    await User.find({ _id: { $in: ids } })
      .select('+email +passwordHash')
      .lean(),
    before,
  );
  console.log(
    'PASS: Anonymous requests, account selectors and mutation attempts cannot expose peers or change account data.',
  );
  await Session.updateOne({ userId: ids[0] }, { expiresAt: new Date(Date.now() - 1000) });
  assert.equal((await request(0)).status, 401);
  console.log('PASS: Expired sessions cannot access the private preview.');
} catch (error) {
  console.error(
    `Preview verification failed (${error.name}). No connection strings or credentials are logged.`,
  );
  const codes = [...(error.reason?.servers?.values() || [])]
    .map((server) => server.error?.cause?.code || server.error?.code)
    .filter(Boolean);
  if (codes.length) console.error(`Connection error codes: ${[...new Set(codes)].join(', ')}`);
  process.exitCode = 1;
} finally {
  if (server) await new Promise((resolve) => server.close(resolve));
  if (mongoose.connection.readyState === 1) {
    try {
      await Session.deleteMany({ userId: { $in: ids } });
      await User.deleteMany({ _id: { $in: ids } });
      assert.equal(await User.countDocuments({ _id: { $in: ids } }), 0);
      assert.equal(await Session.countDocuments({ userId: { $in: ids } }), 0);
      console.log('PASS: Only the generated preview fixtures were removed.');
    } catch {
      console.error('Preview fixture cleanup failed.');
      process.exitCode = 1;
    }
  }
  await mongoose.disconnect();
}
