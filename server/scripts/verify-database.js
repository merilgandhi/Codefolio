import 'dotenv/config';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';
import { User } from '../models/User.js';
import { toPublicPortfolio } from '../serializers/publicPortfolio.js';

const uri = process.env.MONGODB_URI?.trim();
const options = { serverSelectionTimeoutMS: 10000, connectTimeoutMS: 10000, autoIndex: false };

async function connect() {
  assert.ok(uri, 'Configure MONGODB_URI before running database verification.');
  await mongoose.connect(uri, options);
}

async function readInFreshProcess(id) {
  await connect();
  const user = await User.findById(id).lean();
  assert.ok(user, 'Saved verification record is missing.');
  assert.equal(user.email, undefined, 'Default query exposed email.');
  assert.equal(user.passwordHash, undefined, 'Default query exposed passwordHash.');
  process.stdout.write(JSON.stringify(toPublicPortfolio(user)));
}

async function verify() {
  // IDs are allocated before writes, so cleanup also covers a write whose response is lost.
  const ids = Array.from({ length: 3 }, () => new mongoose.Types.ObjectId());
  const suffix = randomBytes(8).toString('hex');
  const username = `verify-${suffix}`;
  const email = `verify-${suffix}@example.invalid`;
  const fixture = {
    _id: ids[0],
    username,
    email,
    passwordHash: randomBytes(64).toString('hex'), // Non-login fixture, not an authentication implementation.
    profile: {
      name: 'Temporary database verification',
      bio: 'CodeFolio automated persistence check.',
      resumeUrl: 'https://example.com/resume.pdf',
      socialLinks: [{ label: 'GitHub', url: 'https://github.com/example' }],
    },
    projects: [
      {
        title: 'Verification project',
        description: 'Temporary test content.',
        techStack: ['React', 'Node.js'],
        repoLink: 'https://github.com/example/project',
        liveLink: 'https://example.com',
        screenshot: 'https://example.com/screenshot.webp',
      },
    ],
    skills: { frontend: ['React'], backend: ['Express'], devops: ['Docker'] },
  };

  try {
    await connect();
    await mongoose.connection.db.command({ ping: 1 });
    console.log('PASS: Atlas connection and database ping.');

    // Add declared indexes only; never drop or synchronize away existing indexes.
    await User.createIndexes();
    const indexes = await User.collection.indexes();
    for (const field of ['username', 'email']) {
      assert.ok(
        indexes.some(
          (index) => index.unique && index.key[field] === 1 && Object.keys(index.key).length === 1,
        ),
      );
    }
    console.log('PASS: Unique username and email indexes exist.');

    const created = await User.create(fixture);
    const projectId = String(created.projects[0]._id);
    let expected = toPublicPortfolio(created);
    let fetched = await User.findById(ids[0]);
    assert.deepEqual(toPublicPortfolio(fetched), expected);
    assert.equal(fetched.email, undefined);
    assert.equal(fetched.passwordHash, undefined);
    assert.ok(fetched.createdAt instanceof Date && fetched.updatedAt instanceof Date);
    const privateRecord = await User.findById(ids[0]).select('+email +passwordHash');
    assert.equal(privateRecord.email, email);
    assert.equal(privateRecord.passwordHash, fixture.passwordHash);
    assert.equal(Object.hasOwn(toPublicPortfolio(privateRecord), 'email'), false);
    console.log(
      'PASS: All required profile, project and skill fields saved and read; private fields excluded by default.',
    );

    fetched.templateId = 'cyberpunk';
    fetched.profile.bio = 'Updated portfolio persisted in Atlas.';
    fetched.projects[0].title = 'Updated verification project';
    fetched.skills.devops.push('GitHub Actions');
    await fetched.save();
    expected = toPublicPortfolio(fetched);
    assert.equal(expected.projects[0].id, projectId);

    // A separate Node process proves that data is not just retained in JS memory.
    await mongoose.disconnect();
    const child = spawnSync(
      process.execPath,
      [fileURLToPath(import.meta.url), '--read', String(ids[0])],
      {
        encoding: 'utf8',
        timeout: 20000,
        windowsHide: true,
      },
    );
    assert.equal(child.status, 0, 'Fresh-process database read failed.');
    assert.deepEqual(JSON.parse(child.stdout), expected);
    console.log(
      'PASS: Updated content, template choice and project IDs survive a fresh Node process.',
    );

    await connect();
    for (const [index, overrides, field] of [
      [
        1,
        { username: username.toUpperCase(), email: `other-${suffix}@example.invalid` },
        'username',
      ],
      [2, { username: `other-${suffix}`, email: email.toUpperCase() }, 'email'],
    ]) {
      await assert.rejects(
        User.create({ ...fixture, ...overrides, _id: ids[index] }),
        (error) => {
          return error.code === 11000 && error.keyPattern?.[field] === 1;
        },
        `Duplicate ${field} was not rejected by its unique index.`,
      );
    }
    console.log('PASS: MongoDB rejects duplicate usernames and emails after normalization.');

    const first = await User.findById(ids[0]);
    const stale = await User.findById(ids[0]);
    first.profile.bio = 'Concurrent save check.';
    await first.save();
    stale.profile.bio = 'This stale edit must not overwrite the first save.';
    await assert.rejects(stale.save(), { name: 'VersionError' });
    console.log('PASS: Stale concurrent saves are rejected.');
  } finally {
    if (uri) {
      if (mongoose.connection.readyState !== 1) await connect();
      // Only these three IDs generated by this run may be removed.
      await User.deleteMany({ _id: { $in: ids } });
      assert.equal(await User.countDocuments({ _id: { $in: ids } }), 0);
      console.log('PASS: Temporary verification records removed.');
    }
  }
}

try {
  if (process.argv[2] === '--read') await readInFreshProcess(process.argv[3]);
  else await verify();
} catch (error) {
  // Driver errors can contain hosts or credentials. Never print raw error objects.
  const safeName = [
    'AssertionError',
    'ValidationError',
    'VersionError',
    'MongoServerError',
    'MongooseServerSelectionError',
  ].includes(error.name)
    ? error.name
    : 'VerificationError';
  console.error(
    `FAIL: Database verification did not finish (${safeName}). Check database access, indexes and connectivity.`,
  );
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
