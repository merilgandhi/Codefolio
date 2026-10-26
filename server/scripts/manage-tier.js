import 'dotenv/config';
import mongoose from 'mongoose';
import { isUsername } from '../validation/portfolio.js';
import { changeAccountTier } from '../plans/changeTier.js';

const [username, tier, ...flags] = process.argv.slice(2);
if (
  !isUsername(username) ||
  !['free', 'pro'].includes(tier) ||
  flags.some((flag) => flag !== '--apply') ||
  flags.length > 1
) {
  console.error(
    'Usage: npm run account:tier -- <username> <free|pro> [--apply]. Without --apply this only previews the change.',
  );
  process.exitCode = 1;
} else {
  try {
    if (!process.env.MONGODB_URI) throw new Error('Database not configured.');
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 7000,
      socketTimeoutMS: 10000,
      autoIndex: false,
    });
    const result = await changeAccountTier(username, tier, { apply: flags.includes('--apply') });
    console.log(
      result.dryRun
        ? `DRY RUN: @${username} is ${result.current}; requested ${tier}. Add --apply to update this account.`
        : result.changed
          ? `UPDATED: @${username} now has the ${tier} plan.`
          : `UNCHANGED: @${username} already has the ${tier} plan.`,
    );
  } catch (error) {
    console.error(
      ['Account not found.', 'Account changed concurrently. Run the command again.'].includes(
        error.message,
      )
        ? error.message
        : 'Tier update failed. Check the database configuration and network access.',
    );
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}
