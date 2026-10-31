import { Link } from 'react-router-dom';
import { useAuth } from './auth/AuthContext.jsx';
import ThemeToggle from './components/ThemeToggle.jsx';

const features = [
  ['01', 'Tell your story', 'Add your introduction, résumé link, and professional profiles.'],
  ['02', 'Show your work', 'Present projects with their descriptions, technologies, and links.'],
  ['03', 'Choose your style', 'Pick Bento Developer or Split-Screen Engineer for your portfolio.'],
  [
    '04',
    'Preview and share',
    'Review draft changes, save your work, and share your public portfolio link.',
  ],
];

export default function Home() {
  const { user } = useAuth();

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
              Create a polished developer portfolio without building a website from scratch. Bring
              your profile, projects, and skills together, then publish a page that’s ready to
              share.
            </p>
            <a
              className="mt-[30px] mb-[15px] inline-flex items-center gap-[35px] rounded-[7px] bg-action px-[21px] py-[15px] text-xs font-semibold text-action-ink hover:bg-action-hover [&>span]:text-[19px]"
              href="#build-plan"
            >
              Explore the features <span aria-hidden="true">↗</span>
            </a>
            <span className="block text-[10px] text-quiet">
              From your workspace to a public portfolio link.
            </span>
          </div>
          <div
            className="relative rotate-1 rounded-[20px] bg-[radial-gradient(ellipse_at_60%_50%,var(--color-glow),var(--color-soft)_75%)] px-[25px] pt-[34px] pb-[35px] max-[900px]:px-[15px] max-[900px]:py-[25px] max-sm:mx-auto max-sm:w-[95%] max-sm:max-w-[390px] max-sm:p-[25px]"
            aria-label="Illustrative portfolio concept, not an active profile"
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
                YOUR PORTFOLIO, YOUR WAY
              </span>
              <h2 id="build-title">Everything you need to present your work.</h2>
            </div>
            <p>
              One focused workspace for your profile, projects, and skills.
              <br />
              Choose a layout, preview, and publish.
            </p>
          </div>
          <div className="grid grid-cols-4 gap-3 max-sm:grid-cols-2">
            {features.map(([number, title, description]) => (
              <article
                key={number}
                className="rounded-[9px] border border-line bg-subtle p-5 max-[900px]:p-[15px] [&>h3]:mb-[9px] [&>h3]:text-[13px] [&>h3]:font-semibold [&>p]:text-[11px] [&>p]:leading-[1.8] [&>p]:text-quiet"
              >
                <div className="mb-[26px] flex items-center justify-between text-xs text-quiet">
                  <span>{number}</span>
                  <span className="rounded-full border border-line-soft px-[7px] py-1 text-[8px]">
                    Included
                  </span>
                </div>
                <h3>{title}</h3>
                <p>{description}</p>
              </article>
            ))}
          </div>
        </section>
      </main>
      <footer className="flex justify-between border-t border-line-soft pt-[22px] pb-7 text-[10px] text-quiet max-sm:flex-wrap max-sm:gap-[15px] max-sm:text-[9px] max-sm:[&>span:nth-child(2)]:hidden">
        <span>CodeFolio © {new Date().getFullYear()}</span>
        <span>A place for what you build.</span>
        <span>Build it. Preview it. Share it.</span>
      </footer>
    </div>
  );
}
