export function isWebUrl(value) {
  if (value === '') return true;
  if (typeof value !== 'string' || value.length > 2048 || /[\s\\]/.test(value)) return false;
  if (!/^https?:\/\//i.test(value)) return false;
  try {
    const url = new URL(value);
    return (
      ['http:', 'https:'].includes(url.protocol) &&
      Boolean(url.hostname) &&
      !url.username &&
      !url.password
    );
  } catch {
    return false;
  }
}

export function validateProfile(input) {
  const fields = {};
  const object = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
  if (!object(input)) return { fields: { name: 'Provide a profile object.' } };
  if (
    Object.keys(input).some((key) => !['name', 'bio', 'socialLinks', 'resumeUrl'].includes(key))
  ) {
    return { fields: { root: 'Only name, bio, social links and resume URL can be edited here.' } };
  }
  const string = (key, max, required = false) => {
    const value = input[key] === undefined && !required ? '' : input[key];
    if (typeof value !== 'string' || value.trim().length > max || (required && !value.trim())) {
      fields[key] = required ? `Enter 1–${max} characters.` : `Use at most ${max} characters.`;
      return '';
    }
    return value.trim();
  };
  const name = string('name', 100, true);
  const bio = string('bio', 2000);
  const resumeUrl = string('resumeUrl', 2048);
  if (!isWebUrl(resumeUrl)) fields.resumeUrl = 'Use a full HTTP or HTTPS URL without credentials.';
  const links = input.socialLinks === undefined ? [] : input.socialLinks;
  const socialLinks = [];
  if (!Array.isArray(links) || links.length > 10)
    fields.socialLinks = 'Use at most 10 social links.';
  else
    links.forEach((link, index) => {
      if (!object(link) || Object.keys(link).some((key) => !['label', 'url'].includes(key))) {
        fields[`socialLinks.${index}.label`] = 'Provide a label and URL only.';
        return;
      }
      const label = typeof link.label === 'string' ? link.label.trim() : '';
      const url = typeof link.url === 'string' ? link.url.trim() : '';
      if (!label || label.length > 40)
        fields[`socialLinks.${index}.label`] = 'Enter a label of 1–40 characters.';
      if (!url || !isWebUrl(url))
        fields[`socialLinks.${index}.url`] = 'Use a full HTTP or HTTPS URL without credentials.';
      socialLinks.push({ label, url });
    });
  return { fields, profile: { name, bio, resumeUrl, socialLinks } };
}
