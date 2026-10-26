import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from './auth/AuthContext.jsx';
import ThemeToggle from './components/ThemeToggle.jsx';

const milestones = [
  ['01', 'The foundation', 'React, Express, and database configuration.', 'Complete'],
  ['02', 'Your workspace', 'Accounts are ready. Portfolio editing comes next.', 'Current step'],
  ['03', 'Your portfolio', 'Distinct templates and a link to call your own.', 'Planned'],
  ['04', 'The finishing touches', 'Live preview, search visibility, and contact email.', 'Planned'],
];

export default function Home() {
  const { user } = useAuth();
  const [health, setHealth] = useState({ state: 'loading' });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    let disposed = false;
    const timeout = setTimeout(() => controller.abort(), 8000);
    setHealth({ state: 'loading' });
    fetch('/api/health', { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error('API unavailable');
        return response.json();
      })
      .then((data) => {
        if (data.status !== 'ok' || data.service !== 'codefolio-api')
          throw new Error('Unexpected response');
        setHealth({ state: 'ready', database: data.database });
      })
      .catch(() => {
        if (!disposed) setHealth({ state: 'error' });
      })
      .finally(() => clearTimeout(timeout));
    return () => {
      disposed = true;
      clearTimeout(timeout);
      controller.abort();
    };
  }, [attempt]);

  const apiLabel =
    health.state === 'ready' ? 'Connected' : health.state === 'error' ? 'Unavailable' : 'Checking…';
  const dbLabel =
    health.state !== 'ready'
      ? 'Waiting for API'
      : health.database === 'connected'
        ? 'Connected'
        : health.database === 'not_configured'
          ? 'Not configured'
          : 'Not connected';

  return (
    <div className="mx-auto max-w-[1440px] px-[6.3%] max-[900px]:px-[5%] [&_a:focus-visible]:outline-3 [&_a:focus-visible]:outline-focus [&_a:focus-visible]:outline-offset-5 [&_button:focus-visible]:outline-3 [&_button:focus-visible]:outline-focus [&_button:focus-visible]:outline-offset-5">
      <header className="flex min-h-[100px] flex-wrap items-center justify-between gap-3 border-b border-line-soft py-4 max-sm:min-h-[78px]">
        <a
          href="/"
          className="flex items-center font-display text-[25px] font-extrabold tracking-[-1px] max-sm:text-[22px]"
          aria-label="CodeFolio home"
        >
          <span className="mr-2.5 grid size-9 place-items-center rounded-[10px] bg-brand text-[17px] tracking-[-2px] text-brand-ink">
            &lt;/&gt;
          </span>
          CodeFolio<span className="text-accent">.</span>
        </a>
        <nav aria-label="Account" className="flex flex-wrap items-center gap-3 text-xs sm:gap-5">
          <ThemeToggle />
          {user ? (
            <Link to="/dashboard" className="rounded-lg bg-action px-4 py-2.5 text-action-ink">
              Your workspace ↗
            </Link>
          ) : (
            <>
              <Link to="/login" className="text-muted hover:underline">
                Sign in
              </Link>
              <Link to="/register" className="rounded-lg bg-action px-4 py-2.5 text-action-ink">
                Get started ↗
              </Link>
            </>
          )}
        </nav>
      </header>
      <main id="main-content" tabIndex={-1} className="focus:outline-none">
        <section
          className="grid grid-cols-[1.1fr_1fr] items-center gap-[6%] pt-[76px] pb-[83px] min-[1500px]:py-[90px] max-[900px]:gap-[4%] max-[900px]:py-[50px] max-sm:grid-cols-1 max-sm:gap-10 max-sm:py-[45px]"
          aria-labelledby="hero-title"
        >
          <div className="[&>h1]:my-6 [&>h1]:font-display [&>h1]:text-[clamp(38px,4.2vw,62px)] [&>h1]:font-semibold [&>h1]:leading-[1.13] [&>h1]:tracking-[-3px] [&>h1_span]:text-accent max-[900px]:[&>h1]:tracking-[-2px] max-sm:[&>h1]:text-[44px] max-sm:[&>h1]:tracking-[-2.5px] [&>p]:max-w-[430px] [&>p]:text-[15px] [&>p]:leading-[1.85] [&>p]:text-muted max-sm:[&>p]:text-sm">
            <span className="text-[10px] font-bold tracking-[1.8px] text-muted">
              MADE FOR DEVELOPERS. BUILT AROUND YOU.
            </span>
            <h1 id="hero-title">
              Good work deserves
              <br />a <span>great home.</span>
            </h1>
            <p>
              Your projects, your skills, your story. We’re building a simpler way to turn what you
              do into a portfolio you’re proud to share.
            </p>
            <a
              className="mt-[30px] mb-[15px] inline-flex items-center gap-[35px] rounded-[7px] bg-action px-[21px] py-[15px] text-xs font-semibold text-action-ink hover:bg-action-hover [&>span]:text-[19px]"
              href="#build-plan"
            >
              Explore the build plan <span aria-hidden="true">↗</span>
            </a>
            <span className="block text-[10px] text-quiet">
              Step by step. From your first project to your own URL.
            </span>
          </div>
          <div
            className="relative rotate-1 rounded-[20px] bg-[radial-gradient(ellipse_at_60%_50%,var(--color-glow),var(--color-soft)_75%)] px-[25px] pt-[34px] pb-[35px] max-[900px]:px-[15px] max-[900px]:py-[25px] max-sm:mx-auto max-sm:w-[95%] max-sm:max-w-[390px] max-sm:p-[25px]"
            aria-label="Illustration of a future portfolio template"
          >
            <span className="mb-5 block text-center text-[8px] tracking-[2px] text-quiet">
              THE POSSIBILITIES, IN PREVIEW
            </span>
            <div className="-rotate-3 rounded-[10px] border border-line bg-panel p-[22px] shadow-[0_15px_35px_var(--color-shadow)] [&>h2]:my-2.5 [&>h2]:font-display [&>h2]:text-[25px] [&>h2]:font-bold [&>h2]:leading-[1.25] [&>h2]:tracking-[-1px] [&>h2>span]:block [&>h2>span]:font-medium [&>h2>span]:text-quiet [&>p]:max-w-[240px] [&>p]:text-[10px] [&>p]:leading-[1.7] [&>p]:text-muted">
              <div className="flex justify-between text-[10px] font-bold [&>span+span]:text-[8px] [&>span+span]:font-normal [&>span+span]:text-quiet">
                <span>alex.dev</span>
                <span>Portfolio concept ↗</span>
              </div>
              <div
                className="mt-[30px] mb-4 grid size-[50px] place-items-center rounded-full bg-soft font-display text-[28px] tracking-[-2px]"
                aria-hidden="true"
              >
                a.
              </div>
              <div className="flex items-center gap-[5px] text-[7px] tracking-[1px] text-muted">
                <span className="inline-block size-1.5 shrink-0 rounded-full bg-status-ok" />
                OPEN TO POSSIBILITIES
              </div>
              <h2>
                Alex Morgan
                <span>
                  Developer. Maker.
                  <br />
                  Curious by default.
                </span>
              </h2>
              <p>I turn interesting problems into thoughtful digital experiences.</p>
              <div className="mt-3.5 mb-[25px] flex flex-wrap gap-[5px] [&>span]:rounded [&>span]:border [&>span]:border-line [&>span]:px-1.5 [&>span]:py-1 [&>span]:text-[7px] [&>span]:text-muted">
                <span>React</span>
                <span>Node.js</span>
                <span>A little imagination</span>
              </div>
              <div className="flex items-center gap-2.5 border-t border-line-soft py-3.5 [&>div]:flex-1 [&_strong]:block [&_strong]:text-[9px] [&_strong]:font-medium [&>div>span]:mt-[5px] [&>div>span]:block [&>div>span]:text-[8px] [&>div>span]:text-quiet">
                <span
                  className="grid h-[43px] w-[47px] place-items-center rounded-[5px] bg-brand text-[30px] text-brand-ink"
                  aria-hidden="true"
                >
                  ◈
                </span>
                <div>
                  <strong>Something worth building</strong>
                  <span>Selected project / 2026</span>
                </div>
                <span aria-hidden="true">↗</span>
              </div>
              <div className="flex justify-between border-t border-line-soft pt-3 text-[6px] text-quiet">
                A little corner of the internet.<span>Built with CodeFolio</span>
              </div>
            </div>
            <span className="absolute right-[-10px] bottom-[18px] rotate-3 rounded-[5px] border border-line-accent bg-soft px-[17px] py-3 text-[10px] shadow-[0_5px_15px_var(--color-shadow)]">
              Your work. Your point of view.
            </span>
          </div>
        </section>
        <section
          className="scroll-mt-[25px] border-t border-line-soft py-[38px]"
          id="build-plan"
          aria-labelledby="build-title"
        >
          <div className="mb-7 flex items-center justify-between max-sm:items-start max-sm:gap-5 [&_h2]:mt-[9px] [&_h2]:font-display [&_h2]:text-[25px] [&_h2]:font-semibold [&_h2]:tracking-[-1px] max-sm:[&_h2]:text-[23px] [&>p]:text-[11px] [&>p]:leading-[1.8] [&>p]:text-quiet max-sm:[&>p]:hidden">
            <div>
              <span className="text-[10px] font-bold tracking-[1.8px] text-muted">
                THE ROAD AHEAD
              </span>
              <h2 id="build-title">One solid step at a time.</h2>
            </div>
            <p>
              A working foundation first.
              <br />
              The rest grows from here.
            </p>
          </div>
          <div className="grid grid-cols-4 gap-3 max-sm:grid-cols-2">
            {milestones.map(([number, title, description, status], index) => (
              <article
                key={number}
                className={`rounded-[9px] border p-5 max-[900px]:p-[15px] [&>h3]:mb-[9px] [&>h3]:text-[13px] [&>h3]:font-semibold [&>p]:text-[11px] [&>p]:leading-[1.8] [&>p]:text-quiet ${index === 1 ? 'border-line-accent bg-soft' : 'border-line bg-subtle'}`}
              >
                <div className="mb-[26px] flex items-center justify-between text-xs text-quiet">
                  <span>{number}</span>
                  <span
                    className={`rounded-full border px-[7px] py-1 text-[8px] ${index === 1 ? 'border-line-accent bg-chip text-success' : 'border-line-soft'}`}
                  >
                    {status}
                  </span>
                </div>
                <h3>{title}</h3>
                <p>{description}</p>
              </article>
            ))}
          </div>
        </section>
        <section
          className="mb-[45px] flex items-center gap-[25px] rounded-[9px] bg-subtle px-6 py-5 max-[900px]:flex-wrap max-sm:gap-[18px] max-sm:p-[18px] max-sm:[&>div:first-child]:w-full [&_h2]:text-xs [&_h2]:font-semibold [&_p]:mt-1.5 [&_p]:text-[10px] [&_p]:text-quiet [&>button]:cursor-pointer [&>button]:rounded-[5px] [&>button]:border [&>button]:border-line [&>button]:bg-transparent [&>button]:px-2.5 [&>button]:py-[7px] [&>button]:text-[10px] [&>button:disabled]:cursor-wait [&>button:disabled]:opacity-50"
          aria-labelledby="connection-title"
        >
          <div>
            <h2 id="connection-title">Under the hood</h2>
            <p>Live connection status for this workspace.</p>
          </div>
          <div
            className="ml-auto flex gap-[25px] max-[900px]:ml-0 max-[900px]:flex-1 max-[900px]:gap-2.5 max-sm:flex-wrap max-sm:gap-3 [&>span]:flex [&>span]:items-center [&>span]:gap-[7px] [&>span]:text-[10px] [&>span]:text-muted max-sm:[&>span]:w-full [&_strong]:rounded [&_strong]:bg-subtle [&_strong]:px-1.5 [&_strong]:py-1 [&_strong]:text-[9px] [&_strong]:font-medium"
            role="status"
            aria-live="polite"
          >
            <span>
              <i
                className={`size-1.5 shrink-0 rounded-full ${health.state === 'ready' ? 'bg-status-ok' : 'bg-status-warn'}`}
              />
              Express API <strong>{apiLabel}</strong>
            </span>
            <span>
              <i
                className={`size-1.5 shrink-0 rounded-full ${health.database === 'connected' ? 'bg-status-ok' : 'bg-status-warn'}`}
              />
              MongoDB <strong>{dbLabel}</strong>
            </span>
          </div>
          <button
            onClick={() => setAttempt((value) => value + 1)}
            disabled={health.state === 'loading'}
          >
            Recheck <span aria-hidden="true">↻</span>
          </button>
        </section>
      </main>
      <footer className="flex justify-between border-t border-line-soft pt-[22px] pb-7 text-[10px] text-quiet max-sm:flex-wrap max-sm:gap-[15px] max-sm:text-[9px] max-sm:[&>span:nth-child(2)]:hidden">
        <span>CodeFolio © {new Date().getFullYear()}</span>
        <span>A place for what you build.</span>
        <span>Foundation / v0.1</span>
      </footer>
    </div>
  );
}
