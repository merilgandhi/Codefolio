export function isContactEmail(value) {
  if (typeof value !== 'string' || value.length > 254 || /[\s,;<>\x00-\x1f\x7f]/.test(value))
    return false;
  const parts = value.split('@');
  return (
    parts.length === 2 &&
    parts[0].length <= 64 &&
    !parts[0].startsWith('.') &&
    !parts[0].endsWith('.') &&
    !parts[0].includes('..') &&
    /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+$/i.test(parts[0]) &&
    parts[1].split('.').length >= 2 &&
    parts[1].split('.').every((label) => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(label))
  );
}

export function validateContact(input) {
  const fields = {};
  if (
    !input ||
    typeof input !== 'object' ||
    Array.isArray(input) ||
    Object.keys(input).some(
      (key) => !['name', 'email', 'subject', 'message', 'website'].includes(key),
    )
  )
    return { fields: { root: 'Provide your name, email, subject and message only.' } };
  const contact = {};
  for (const [key, limit, min] of [
    ['name', 100, 1],
    ['email', 254, 1],
    ['subject', 120, 1],
    ['message', 3000, 10],
  ]) {
    const value = typeof input[key] === 'string' ? input[key].trim() : '';
    if (
      value.length < min ||
      value.length > limit ||
      (key !== 'message' && /[\x00-\x1f\x7f]/.test(value)) ||
      (key === 'message' && /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(value))
    )
      fields[key] = `Enter ${min}–${limit} characters${key === 'message' ? '.' : ' on one line.'}`;
    contact[key] = value;
  }
  if (!isContactEmail(contact.email)) fields.email = 'Enter one valid email address.';
  if (
    input.website !== undefined &&
    (typeof input.website !== 'string' || input.website.length > 200)
  )
    fields.root = 'The form could not be submitted. Please reload and try again.';
  return { fields, contact, honeypot: Boolean(input.website) };
}
