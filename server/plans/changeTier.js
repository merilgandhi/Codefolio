import { User } from '../models/User.js';
import { isUsername } from '../validation/portfolio.js';

// Operator helper. The separate demo API uses session identity and version checks.
export async function changeAccountTier(username, tier, { apply = false } = {}) {
  if (!isUsername(username) || !['free', 'pro'].includes(tier))
    throw new TypeError('Provide a valid username and free or pro.');
  const user = await User.findOne({ username }).select('username tier __v').lean().maxTimeMS(5000);
  if (!user) throw new Error('Account not found.');
  const current = user.tier === 'pro' ? 'pro' : 'free';
  if (!apply || current === tier)
    return { username, current, requested: tier, changed: false, dryRun: !apply };
  const result = await User.updateOne(
    { _id: user._id, __v: user.__v === undefined ? { $exists: false } : user.__v },
    { $set: { tier }, $inc: { __v: 1 } },
    { runValidators: true },
  );
  if (result.modifiedCount !== 1)
    throw new Error('Account changed concurrently. Run the command again.');
  return { username, current: tier, requested: tier, changed: true, dryRun: false };
}
