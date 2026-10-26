// Canonical choices shared by schema validation, the API, and the template registry.
export const TEMPLATE_OPTIONS = Object.freeze([
  Object.freeze({
    id: 'bento',
    name: 'Bento Developer',
    description: 'A modular grid that puts your profile, projects, and skills in focus.',
  }),
  Object.freeze({
    id: 'split-screen',
    name: 'Split-Screen Engineer',
    description: 'A sticky profile panel beside an editorial list of projects and skills.',
  }),
]);
export const TEMPLATE_IDS = Object.freeze(TEMPLATE_OPTIONS.map((option) => option.id));
export const DEFAULT_TEMPLATE_ID = TEMPLATE_IDS[0];
export const LEGACY_TEMPLATE_IDS = Object.freeze({
  minimalist: 'bento',
  cyberpunk: 'split-screen',
});
// Keep existing documents valid without silently rewriting account records on reads.
export const STORED_TEMPLATE_IDS = Object.freeze([
  ...TEMPLATE_IDS,
  ...Object.keys(LEGACY_TEMPLATE_IDS),
]);
export function resolveTemplateId(value) {
  if (TEMPLATE_IDS.includes(value)) return value;
  if (typeof value === 'string' && Object.hasOwn(LEGACY_TEMPLATE_IDS, value))
    return LEGACY_TEMPLATE_IDS[value];
  return DEFAULT_TEMPLATE_ID;
}
export const SKILL_CATEGORIES = Object.freeze(['frontend', 'backend', 'devops']);

// These names must never shadow application, API, or static-asset routes.
export const RESERVED_USERNAMES = Object.freeze([
  'admin',
  'api',
  'assets',
  'auth',
  'build',
  'contact',
  'dashboard',
  'demo',
  'favicon',
  'health',
  'login',
  'logout',
  'register',
  'robots',
  'settings',
  'signup',
  'sitemap',
  'support',
  'user',
  'www',
]);
