import { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext.jsx';
import { api } from '../lib/api.js';
import PortfolioRenderer from '../portfolio/PortfolioRenderer.jsx';
import { getTemplate } from '../portfolio/templateRegistry.js';
import { withPortfolioDraft } from './draftPortfolio.js';

export default function LivePortfolioPreview({ patch, dirty }) {
  const { sessionExpired } = useAuth();
  const [saved, setSaved] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    api('/portfolio/preview', { signal: controller.signal })
      .then((result) => {
        if (!controller.signal.aborted) setSaved(result.portfolio);
      })
      .catch((failure) => {
        if (controller.signal.aborted) return;
        if (failure.status === 401) sessionExpired();
        else setError(failure.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [attempt, sessionExpired]);
  const portfolio = saved ? withPortfolioDraft(saved, patch) : null;
  return (
    <aside aria-labelledby="live-preview-title" className="min-w-0">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="live-preview-title" className="font-display text-xl font-semibold">
            Live preview
          </h2>
          <p className="mt-1 text-xs text-muted">
            {portfolio ? getTemplate(portfolio.templateId).name : 'Your portfolio'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="rounded-md bg-soft px-2.5 py-1.5 text-[10px] font-medium text-accent">
            {dirty ? 'Unsaved preview' : 'Saved content'}
          </span>
          <button
            type="button"
            aria-label={error ? 'Try loading preview again' : 'Refresh saved content'}
            title="Refresh saved content; keep your draft"
            disabled={loading}
            onClick={() => setAttempt((value) => value + 1)}
            className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-lg px-2 text-[11px] font-medium text-muted hover:bg-canvas focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:opacity-50"
          >
            <svg
              aria-hidden="true"
              className="size-3.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M20 7v5h-5M4 17v-5h5" />
              <path d="M6 7a7 7 0 0 1 11.5-1L20 9M4 15l2.5 3A7 7 0 0 0 18 17" />
            </svg>
            {loading ? 'Loading…' : 'Refresh'}
          </button>
        </div>
      </div>
      <div className="min-w-0">
        {error && (
          <p
            role="alert"
            className="shrink-0 border border-danger-line bg-danger-bg p-4 text-xs text-danger"
          >
            {error}
          </p>
        )}
        {!saved && loading && (
          <p role="status" className="border border-line bg-panel p-6 text-sm text-muted">
            Loading your portfolio…
          </p>
        )}
        {portfolio && (
          <div
            role="region"
            aria-label="Live portfolio preview canvas"
            tabIndex={0}
            className="min-w-0 rounded-3xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus"
          >
            <PortfolioRenderer portfolio={portfolio} embedded />
          </div>
        )}
      </div>
      <p className="mt-4 text-xs leading-6 text-quiet">
        Preview updates as you type. Save when you’re ready.
      </p>
    </aside>
  );
}
