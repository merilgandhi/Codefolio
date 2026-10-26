// A hostname only: never a URL, wildcard, IP address, port or redirect target.
export function normalizeDomain(value) {
  if (typeof value !== 'string' || value.length > 253) return null;
  const domain = value.trim().toLowerCase();
  const labels = domain.split('.');
  if (
    domain.length > 253 ||
    labels.length < 2 ||
    labels.some((label) => !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label)) ||
    !/^(?:[a-z]{2,63}|xn--[a-z0-9-]{2,59})$/.test(labels.at(-1)) ||
    ['localhost', 'local', 'internal', 'lan'].includes(labels.at(-1))
  )
    return null;
  return domain;
}

export const domainRedirectPath = (domain) => `/api/domains/${encodeURIComponent(domain)}`;

export function validateDomainChange(input, remove = false) {
  const allowed = remove ? ['version'] : ['domain', 'version'];
  if (
    !input ||
    typeof input !== 'object' ||
    Array.isArray(input) ||
    Object.keys(input).some((key) => !allowed.includes(key))
  )
    return {
      fields: {
        root: `Provide only ${remove ? 'the saved version' : 'a domain and its saved version'}.`,
      },
    };
  const fields = {};
  if (!Number.isSafeInteger(input.version) || input.version < 0)
    fields.root = 'Reload saved settings before trying again.';
  const domain = remove ? null : normalizeDomain(input.domain);
  if (!remove && !domain)
    fields.domain =
      'Enter a domain such as yourname.com, without https://, a path or a port. Use ASCII or punycode.';
  return { fields, domain, version: input.version };
}
