import { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext.jsx';
import { api } from '../lib/api.js';
import { launchpadProgress } from '../../shared/launchpad.js';
import { DashboardIcon } from './DashboardSidebar.jsx';

const actionStyle =
  'inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-xl bg-action px-5 py-3 text-sm font-semibold text-action-ink hover:bg-action-hover focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus disabled:opacity-50';
const textStyle =
  'inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-lg px-1 text-xs font-medium text-accent hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus disabled:opacity-50';

export default function DashboardHome({ onOpen }) {
  const { sessionExpired } = useAuth();
  const [portfolio, setPortfolio] = useState(null);
  const [state, setState] = useState('loading');
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setState('loading');
    setError('');
    api('/portfolio/preview', { signal: controller.signal })
      .then((result) => {
        if (controller.signal.aborted) return;
        setPortfolio(result.portfolio);
        setState('ready');
      })
      .catch((failure) => {
        if (controller.signal.aborted) return;
        if (failure.status === 401) sessionExpired();
        else {
          setError(failure.message);
          setState('error');
        }
      });
    return () => controller.abort();
  }, [attempt, sessionExpired]);

  const progress = portfolio ? launchpadProgress(portfolio) : null;
  const next = progress?.next;
  const initials = portfolio?.profile.name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => Array.from(word)[0])
    .join('')
    .toUpperCase();
  return (
    <section
      aria-labelledby="launchpad-title"
      aria-busy={state === 'loading'}
      className="max-w-6xl"
    >
      <p className="text-[10px] font-bold tracking-[2px] text-quiet">LET’S MAKE IT HAPPEN</p>
      <div className="mt-5 flex flex-wrap items-end justify-between gap-6 sm:gap-8">
        <h1
          id="launchpad-title"
          className="font-display text-4xl leading-[1.12] font-semibold tracking-[-1.5px] sm:text-5xl xl:text-6xl xl:tracking-[-2.5px]"
        >
          Your next big thing
          <br className="hidden sm:block" /> starts with you<span className="text-accent">.</span>
        </h1>
        <p className="pb-1 text-sm leading-7 text-muted">
          Four thoughtful steps.
          <br />
          One portfolio that feels like you.
        </p>
      </div>
      {state === 'loading' ? (
        <p
          role="status"
          className="mt-10 rounded-2xl border border-line bg-panel p-6 text-sm text-muted"
        >
          Loading your launchpad…
        </p>
      ) : state === 'error' ? (
        <div className="mt-10 rounded-2xl border border-danger-line bg-danger-bg p-6">
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
          <button
            type="button"
            onClick={() => setAttempt((value) => value + 1)}
            className={`${textStyle} mt-3`}
          >
            Try loading again <DashboardIcon name="refresh" className="size-4" />
          </button>
        </div>
      ) : (
        <>
          <div className="mt-10 flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
            <p className="text-xs leading-6 text-muted">
              <span className="font-semibold text-ink">{progress.completed} of 4 steps ready.</span>{' '}
              Your saved layout is included.
            </p>
            <button
              type="button"
              onClick={() => setAttempt((value) => value + 1)}
              className={textStyle}
            >
              <DashboardIcon name="refresh" className="size-3.5" />
              Refresh dashboard
            </button>
          </div>
          <nav
            aria-label="Portfolio setup steps"
            className="mt-5 grid min-w-0 grid-cols-2 gap-x-5 gap-y-6 md:grid-cols-4 md:gap-x-6"
          >
            {progress.steps.map((step, index) => (
              <button
                type="button"
                key={step.id}
                onClick={() => onOpen(step.id)}
                aria-current={next?.id === step.id ? 'step' : undefined}
                className={`group min-w-0 cursor-pointer border-t-2 pt-4 pb-2 text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus ${next?.id === step.id ? 'border-accent' : 'border-line hover:border-focus'}`}
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="font-display text-xl font-medium tabular-nums text-ink">
                    0{index + 1}
                  </span>
                  {step.done ? (
                    <span className="inline-flex items-center gap-1 text-[11px] text-success">
                      <DashboardIcon name="check" className="size-3.5" />
                      Ready
                    </span>
                  ) : next?.id === step.id ? (
                    <span className="text-[11px] font-medium text-accent">Next step</span>
                  ) : (
                    <DashboardIcon name="arrow" className="size-4 text-muted" />
                  )}
                </span>
                <span className="mt-4 block text-[13px] font-semibold text-ink">{step.label}</span>
                <span className="mt-1.5 block text-[11px] leading-5 text-quiet">{step.detail}</span>
              </button>
            ))}
          </nav>
          <section
            aria-labelledby="next-step-title"
            className="mt-9 grid min-w-0 gap-8 rounded-[24px] border border-line-accent bg-soft p-6 sm:p-9 md:grid-cols-[1.2fr_1fr] md:items-center lg:gap-10 xl:mt-11 xl:p-12"
          >
            <div className="min-w-0">
              <p className="text-[10px] font-bold tracking-[2px] text-muted">
                {next ? 'YOUR NEXT STEP' : 'LOOKING GOOD'}
              </p>
              <h2
                id="next-step-title"
                className="mt-4 max-w-md font-display text-3xl leading-tight font-semibold tracking-[-0.8px] xl:text-4xl"
              >
                {next ? next.title : 'Your portfolio is ready to share.'}
              </h2>
              <p className="mt-4 max-w-md text-sm leading-7 text-muted">
                {next
                  ? next.description
                  : 'Your introduction, work and toolkit are in place. Take a look at your portfolio, make it yours and share your next chapter.'}
              </p>
              <button
                type="button"
                onClick={() => onOpen(next?.id || 'preview')}
                className={`${actionStyle} mt-7`}
              >
                {next ? next.action : 'Preview your portfolio'}
                <DashboardIcon name="arrow-right" className="size-4" />
              </button>
            </div>
            <div
              aria-hidden="true"
              className="relative mx-auto grid w-full min-w-0 max-w-[340px] place-items-center px-3 py-4 md:px-4 md:py-7"
            >
              <div className="w-full min-w-0 rounded-2xl border border-line bg-panel p-6 shadow-xl shadow-shadow sm:rotate-4 sm:p-7">
                <span className="grid size-12 place-items-center rounded-full border border-line-accent bg-soft font-display text-sm font-semibold text-accent">
                  {initials}
                </span>
                <p className="mt-5 font-display text-lg font-semibold tracking-tight [overflow-wrap:anywhere]">
                  {portfolio.profile.name}
                </p>
                <p className="mt-2 line-clamp-2 text-xs leading-6 text-muted [overflow-wrap:anywhere]">
                  {portfolio.profile.bio || 'Your story belongs here.'}
                </p>
                <div className="mt-6 h-1.5 w-11/12 rounded-full bg-soft" />
                <div className="mt-2.5 h-1.5 w-2/3 rounded-full bg-subtle" />
              </div>
              <span className="absolute right-0 bottom-0 font-display text-7xl leading-none text-accent sm:bottom-1">
                ✳
              </span>
            </div>
          </section>
          <footer className="mt-8 flex flex-wrap items-center justify-between gap-5 border-t border-line-soft pt-6 sm:mt-10">
            <div className="min-w-0">
              <p className="text-[10px] font-bold tracking-[1.5px] text-quiet">
                YOUR PUBLIC ADDRESS
              </p>
              <a
                href={`/${portfolio.username}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1.5 inline-flex min-h-11 items-center gap-2 rounded-lg text-sm font-medium text-ink focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus"
              >
                <span className="break-all">/{portfolio.username}</span>
                <DashboardIcon name="arrow" className="size-4 text-muted" />
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
            </div>
            <button type="button" onClick={() => onOpen('preview')} className={textStyle}>
              See your portfolio <DashboardIcon name="arrow" className="size-4" />
            </button>
          </footer>
        </>
      )}
    </section>
  );
}
