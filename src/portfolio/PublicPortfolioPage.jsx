import { useEffect, useId, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { publicUsername } from '../../shared/publicRoutes.js';
import { api } from '../lib/api.js';
import Brand from '../components/Brand.jsx';
import ThemeToggle from '../components/ThemeToggle.jsx';
import PortfolioRenderer from './PortfolioRenderer.jsx';
import { usePublicPageMetadata } from '../seo/SeoProvider.jsx';
import ContactForm from './components/ContactForm.jsx';

function readInitial(username) {
  const element = document.getElementById('codefolio-public-data');
  if (!element) return null;
  try {
    const data = JSON.parse(element.textContent);
    return data.username === username && [200, 404, 503].includes(data.status) ? data : null;
  } catch {
    return null;
  }
}

export default function PublicPortfolioPage() {
  const contactId = `${useId()}-contact`;
  const { username: requested } = useParams();
  const username = publicUsername(requested);
  const [state, setState] = useState(() => readInitial(username));
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const initial = attempt === 0 ? readInitial(username) : null;
    document.getElementById('codefolio-public-data')?.remove();
    if (!username) {
      setState({ username, status: 404 });
      return;
    }
    if (initial) {
      setState(initial);
      return;
    }
    const controller = new AbortController();
    setState({ username, status: 0 });
    api(`/portfolios/${encodeURIComponent(username)}`, { signal: controller.signal })
      .then(({ portfolio }) => {
        if (!controller.signal.aborted) setState({ username, status: 200, portfolio });
      })
      .catch((error) => {
        if (!controller.signal.aborted)
          setState({ username, status: error.status === 404 ? 404 : 503 });
      });
    return () => controller.abort();
  }, [username, attempt]);

  const current = state?.username === username ? state : null;
  usePublicPageMetadata(current);
  if (username && requested !== username) return <Navigate replace to={`/${username}`} />;
  return (
    <div className="mx-auto max-w-[1440px] px-5 sm:px-10 lg:px-14">
      <header className="flex min-h-24 items-center justify-between gap-4 border-b border-line-soft py-5">
        <Brand />
        <ThemeToggle />
      </header>
      <main id="main-content" tabIndex={-1} className="py-10 focus:outline-none sm:py-14">
        {!current || current.status === 0 ? (
          <p role="status" className="py-20 text-center text-muted">
            Loading portfolio…
          </p>
        ) : current.status === 200 ? (
          <>
            <PortfolioRenderer portfolio={current.portfolio} contactHref={`#${contactId}`} />
            <ContactForm
              key={username}
              id={contactId}
              username={username}
              name={current.portfolio.profile.name}
            />
          </>
        ) : (
          <section className="mx-auto max-w-xl py-20 text-center">
            <p className="text-xs font-semibold tracking-widest text-muted">
              {current.status === 404 ? '404' : 'PLEASE TRY AGAIN'}
            </p>
            <h1 className="mt-4 font-display text-3xl font-semibold sm:text-4xl">
              {current.status === 404 ? 'Portfolio not found' : 'Portfolio temporarily unavailable'}
            </h1>
            <p className="mt-5 text-sm leading-7 text-muted">
              {current.status === 404
                ? 'Check the username in the link. This portfolio may not exist.'
                : 'We could not load this portfolio. Try again in a moment.'}
            </p>
            {current.status !== 404 && (
              <button
                onClick={() => setAttempt((value) => value + 1)}
                className="mt-6 min-h-11 cursor-pointer rounded-lg bg-action px-5 py-3 text-sm font-medium text-action-ink focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus"
              >
                Try again
              </button>
            )}
            <Link
              to="/"
              className="mx-4 mt-6 inline-flex min-h-11 items-center text-sm underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus"
            >
              Return home
            </Link>
          </section>
        )}
      </main>
    </div>
  );
}

export function PublicPortfolioAlias() {
  const { username } = useParams();
  return <Navigate replace to={`/${encodeURIComponent(username)}`} />;
}
