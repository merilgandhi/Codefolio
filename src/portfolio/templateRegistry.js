import { TEMPLATE_OPTIONS, resolveTemplateId } from '../../shared/portfolio.js';
import BentoDeveloper from './templates/BentoDeveloper.jsx';
import SplitScreenEngineer from './templates/SplitScreenEngineer.jsx';

const components = { bento: BentoDeveloper, 'split-screen': SplitScreenEngineer };
export const TEMPLATE_REGISTRY = Object.freeze(
  Object.fromEntries(
    TEMPLATE_OPTIONS.map((option) => [
      option.id,
      Object.freeze({ ...option, Component: components[option.id] }),
    ]),
  ),
);

export function getTemplate(templateId) {
  return TEMPLATE_REGISTRY[resolveTemplateId(templateId)];
}
