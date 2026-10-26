import { RESERVED_USERNAMES } from '../../shared/portfolio.js';

export function isUsername(value) {
  return (
    typeof value === 'string' &&
    /^[a-z0-9](?:[a-z0-9_-]{1,28}[a-z0-9])$/.test(value) &&
    !RESERVED_USERNAMES.includes(value)
  );
}

export function isEmail(value) {
  // Deliberately basic syntax validation; address ownership requires verification.
  return (
    typeof value === 'string' && value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
  );
}

export { isWebUrl } from '../../shared/profile.js';
