import { RESERVED_USERNAMES } from './portfolio.js';

export function publicUsername(value) {
  if (typeof value !== 'string') return null;
  const username = value.toLowerCase();
  return /^[a-z0-9](?:[a-z0-9_-]{1,28}[a-z0-9])$/.test(username) &&
    !RESERVED_USERNAMES.includes(username)
    ? username
    : null;
}

// Vite must forward portfolio documents, while keeping its own modules and files.
export function isPublicDocumentPath(pathname) {
  const parts = pathname.split('/').filter(Boolean);
  if (parts.length === 2 && parts[0].toLowerCase() === 'user') return true;
  if (parts.length !== 1 || /[.@]/.test(parts[0])) return false;
  return !RESERVED_USERNAMES.includes(parts[0].toLowerCase());
}
