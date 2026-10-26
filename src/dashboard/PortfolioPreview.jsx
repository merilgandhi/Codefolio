import { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext.jsx';
import { api } from '../lib/api.js';
import PortfolioRenderer from '../portfolio/PortfolioRenderer.jsx';
import { getTemplate } from '../portfolio/templateRegistry.js';

export default function PortfolioPreview({ templateId }) {
  const { sessionExpired } = useAuth();
  const [portfolio, setPortfolio] = useState(null);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setStatus('loading');
    setError('');
    api('/portfolio/preview', { signal: controller.signal })
      .then((result) => {
        if (controller.signal.aborted) return;
        setPortfolio(result.portfolio);
        setStatus('ready');
      })
      .catch((failure) => {
        if (controller.signal.aborted) return;
        if (failure.status === 401) sessionExpired();
        else {
          setError(failure.message);
          setStatus('error');
        }
      });
    return () => controller.abort();
  }, [attempt, sessionExpired]);

  return (
    <section
      className="mt-8"
      aria-labelledby="portfolio-preview-title"
      aria-busy={status === 'loading'}
    >
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2
            id="portfolio-preview-title"
            className="font-display text-2xl font-semibold tracking-tight"
          >
            {portfolio ? getTemplate(templateId ?? portfolio.templateId).name : 'Portfolio preview'}
          </h2>
          <p className="mt-2 max-w-xl text-xs leading-6 text-muted">
            {templateId
              ? 'Preview this layout with your saved content. Choose Templates to save your preferred layout.'
              : 'Your saved layout, profile, projects, and skills. Save changes in the editor, then return here to see them.'}
          </p>
        </div>
        <button
          onClick={() => setAttempt((value) => value + 1)}
          disabled={status === 'loading'}
          className="min-h-11 cursor-pointer rounded-lg border border-line px-4 py-2.5 text-xs font-medium hover:bg-soft focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus disabled:cursor-not-allowed disabled:opacity-50"
        >
          Refresh preview
        </button>
      </div>
      <p className="mb-5 inline-block rounded-full border border-line-accent bg-soft px-3 py-1.5 text-[11px] font-medium text-success">
        Private preview · saved content
      </p>
      {status === 'loading' && (
        <p role="status" className="rounded-2xl border border-line bg-panel p-8 text-sm text-muted">
          Loading your portfolio…
        </p>
      )}
      {status === 'error' && (
        <div
          role="alert"
          className="rounded-xl border border-danger-line bg-danger-bg p-5 text-sm text-danger"
        >
          <p>{error}</p>
          <p className="mt-2 text-xs">Use Refresh preview to try again.</p>
        </div>
      )}
      {status === 'ready' && portfolio && (
        <PortfolioRenderer
          portfolio={portfolio}
          templateId={templateId ?? portfolio.templateId}
          embedded
        />
      )}
    </section>
  );
}
