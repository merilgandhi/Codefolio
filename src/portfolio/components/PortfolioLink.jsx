import { isWebUrl } from '../../../shared/profile.js';
import PortfolioIcon from './PortfolioIcon.jsx';

export const focusStyle =
  'focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus';

export default function PortfolioLink({ href, children, className = '', icon = 'arrow', label }) {
  if (!href || !isWebUrl(href)) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className={`inline-flex min-h-11 items-center justify-between gap-3 rounded-lg ${focusStyle} ${className}`}
    >
      <span className="min-w-0 [overflow-wrap:anywhere]">{children}</span>
      <PortfolioIcon name={icon} className="size-4 shrink-0" />
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}
