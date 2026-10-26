import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const derive = promisify(scrypt);
const parameters = { N: 65536, r: 8, p: 2, maxmem: 128 * 1024 * 1024 };

export function validPassword(value) {
  return (
    typeof value === 'string' &&
    value.length >= 12 &&
    value.length <= 128 &&
    Buffer.byteLength(value, 'utf8') <= 512
  );
}

export async function hashPassword(password) {
  if (!validPassword(password)) throw new TypeError('Password must contain 12–128 characters.');
  const salt = randomBytes(16).toString('hex');
  const key = await derive(password, salt, 64, parameters);
  return `scrypt$65536$8$2$${salt}$${key.toString('hex')}`;
}

export async function verifyPassword(password, encoded) {
  if (!validPassword(password) || typeof encoded !== 'string') return false;
  const parts = encoded.split('$');
  if (
    parts.length !== 6 ||
    parts.slice(0, 4).join('$') !== 'scrypt$65536$8$2' ||
    !/^[a-f0-9]{32}$/.test(parts[4]) ||
    !/^[a-f0-9]{128}$/.test(parts[5])
  )
    return false;
  const key = await derive(password, parts[4], 64, parameters);
  return timingSafeEqual(key, Buffer.from(parts[5], 'hex'));
}
