import { getTemplate } from './templateRegistry.js';

export default function PortfolioRenderer({
  portfolio,
  templateId = portfolio.templateId,
  embedded = false,
  contactHref,
}) {
  const { Component } = getTemplate(templateId);
  return <Component portfolio={portfolio} embedded={embedded} contactHref={contactHref} />;
}
