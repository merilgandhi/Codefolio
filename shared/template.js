import { TEMPLATE_IDS } from './portfolio.js';

export function validateTemplateSelection(input) {
  const fields = {};
  if (
    !input ||
    typeof input !== 'object' ||
    Array.isArray(input) ||
    Object.keys(input).some((key) => !['templateId', 'version'].includes(key))
  ) {
    return { fields: { root: 'Provide only a template choice and its saved version.' } };
  }
  if (!TEMPLATE_IDS.includes(input.templateId))
    fields.templateId = 'Choose Bento Developer or Split-Screen Engineer.';
  if (!Number.isSafeInteger(input.version) || input.version < 0)
    fields.root = 'Reload the saved template before trying again.';
  return { fields, templateId: input.templateId, version: input.version };
}
