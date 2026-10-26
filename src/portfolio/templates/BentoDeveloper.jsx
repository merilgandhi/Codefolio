import { useId } from 'react';
import { SKILL_CATEGORIES } from '../../../shared/portfolio.js';
import { SKILL_LABELS } from '../../../shared/skills.js';
import { isWebUrl } from '../../../shared/profile.js';
import PortfolioIcon from '../components/PortfolioIcon.jsx';
import PortfolioLink, { focusStyle } from '../components/PortfolioLink.jsx';
import ProjectCard from '../components/ProjectCard.jsx';
import ProBadge from '../../components/ProBadge.jsx';

// Presentation only: the caller supplies an explicit public portfolio data object.
// This component can serve both the private preview and the future public route.
export default function BentoDeveloper({ portfolio, embedded = false, contactHref }) {
  const uid = useId();
  const { username, profile, projects = [], skills = {} } = portfolio;
  const name = profile.name || username;
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => [...word][0])
    .join('')
    .toUpperCase();
  const links = (profile.socialLinks || []).filter((link) => link.url && isWebUrl(link.url));
  const hasResume = Boolean(profile.resumeUrl && isWebUrl(profile.resumeUrl));
  const hasSkills = SKILL_CATEGORIES.some((category) => skills[category]?.length);
  const Title = embedded ? 'h2' : 'h1';
  const SectionTitle = embedded ? 'h3' : 'h2';
  const SubsectionTitle = embedded ? 'h4' : 'h3';
  const projectHeading = embedded ? 'h4' : 'h3';
  const workId = `${uid}-work`;
  const skillsId = `${uid}-skills`;
  const linksId = `${uid}-links`;
  const titleId = `${uid}-name`;

  return (
    <article
      aria-labelledby={titleId}
      className="@container min-w-0 rounded-3xl border border-line bg-canvas p-4 text-ink [overflow-wrap:anywhere] sm:p-7"
    >
      <header className="mb-7 flex flex-wrap items-center justify-between gap-4 border-b border-line-soft pb-5">
        <a
          href={`#${titleId}`}
          className={`flex min-h-11 min-w-0 items-center gap-3 rounded-lg ${focusStyle}`}
        >
          <span
            aria-hidden="true"
            className="grid size-10 shrink-0 place-items-center rounded-xl bg-action font-mono text-sm font-semibold text-action-ink"
          >
            {initials}
          </span>
          <span className="min-w-0 font-mono text-xs text-muted">@{username}</span>
          {portfolio.isPro === true && <ProBadge />}
        </a>
        <nav
          aria-label="Portfolio sections"
          className="flex flex-wrap gap-4 text-xs font-medium text-muted"
        >
          {[
            [workId, 'Work'],
            [skillsId, 'Skills'],
            [linksId, 'Links'],
            ...(contactHref ? [[contactHref.slice(1), 'Contact']] : []),
          ].map(([id, label]) => (
            <a
              key={id}
              href={`#${id}`}
              className={`inline-flex min-h-11 items-center rounded-md hover:text-ink ${focusStyle}`}
            >
              {label}
            </a>
          ))}
        </nav>
      </header>

      <div className="grid min-w-0 grid-cols-1 gap-4 @3xl:grid-cols-3">
        <section className="relative flex min-w-0 flex-col justify-center rounded-2xl border border-line bg-panel p-6 @xl:p-9 @3xl:col-span-2">
          <div className="mb-8 flex items-center gap-2 font-mono text-[10px] font-medium tracking-[0.18em] text-muted">
            <PortfolioIcon name="code" className="size-4" />
            DEVELOPER PORTFOLIO
          </div>
          <Title
            id={titleId}
            className="scroll-mt-8 font-display text-4xl leading-[1.12] font-semibold tracking-[-0.04em] @xl:text-5xl"
          >
            {name}
            <span aria-hidden="true" className="text-accent">
              .
            </span>
          </Title>
          {profile.bio && (
            <p className="mt-5 max-w-2xl whitespace-pre-wrap text-sm leading-7 text-muted @xl:text-base @xl:leading-8">
              {profile.bio}
            </p>
          )}
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <a
              href={`#${workId}`}
              className={`inline-flex min-h-11 items-center gap-3 rounded-xl bg-action px-5 py-3 text-xs font-semibold text-action-ink hover:bg-action-hover ${focusStyle}`}
            >
              Explore my work<span aria-hidden="true">↓</span>
            </a>
            {hasResume && (
              <PortfolioLink
                href={profile.resumeUrl}
                icon="document"
                className="px-2 text-xs font-semibold"
              >
                View résumé
              </PortfolioLink>
            )}
          </div>
        </section>

        <section
          id={linksId}
          aria-labelledby={`${uid}-links-title`}
          className="min-w-0 scroll-mt-8 rounded-2xl border border-line-accent bg-soft p-6 @xl:p-7"
        >
          <span className="font-mono text-[10px] tracking-[0.18em] text-muted">ELSEWHERE</span>
          <SectionTitle
            id={`${uid}-links-title`}
            className="mt-3 font-display text-2xl font-semibold tracking-tight"
          >
            Let’s connect.
          </SectionTitle>
          <p className="mt-3 text-sm leading-6 text-muted">
            Find my work and professional profiles around the web.
          </p>
          {links.length > 0 ? (
            <ul className="mt-5 divide-y divide-line-accent">
              {links.map((link, index) => (
                <li key={`${link.url}-${index}`}>
                  <PortfolioLink href={link.url} className="w-full py-3 text-sm font-medium">
                    {link.label}
                  </PortfolioLink>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-5 text-xs leading-6 text-muted">
              Social links will appear here once added.
            </p>
          )}
          {hasResume && (
            <PortfolioLink
              href={profile.resumeUrl}
              icon="document"
              className="mt-4 w-full rounded-xl border border-line-accent bg-panel px-4 py-3 text-xs font-semibold"
            >
              View résumé
            </PortfolioLink>
          )}
        </section>

        <section
          id={workId}
          aria-labelledby={`${uid}-work-title`}
          className="min-w-0 scroll-mt-8 @3xl:col-span-3"
        >
          <div className="flex flex-wrap items-end justify-between gap-3 px-1 pt-6 pb-5">
            <div>
              <p className="font-mono text-[10px] tracking-[0.18em] text-muted">
                BUILT WITH PURPOSE
              </p>
              <SectionTitle
                id={`${uid}-work-title`}
                className="mt-2 font-display text-2xl font-semibold tracking-tight @xl:text-3xl"
              >
                Projects & experiments
              </SectionTitle>
            </div>
            <span className="font-mono text-xs text-muted">
              {String(projects.length).padStart(2, '0')}{' '}
              {projects.length === 1 ? 'project' : 'projects'}
            </span>
          </div>
          {projects.length > 0 ? (
            <div className="grid min-w-0 grid-cols-1 gap-4 @xl:grid-cols-2">
              {projects.map((project, index) => (
                <ProjectCard
                  key={project.id || index}
                  project={project}
                  featured={index === 0}
                  wide={index === 0 || (index === projects.length - 1 && projects.length % 2 === 0)}
                  headingAs={projectHeading}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-line bg-panel px-6 py-12 text-center">
              <PortfolioIcon name="code" className="mx-auto size-7 text-muted" />
              <p className="mt-4 font-display text-lg font-semibold">The next build starts here.</p>
              <p className="mt-2 text-sm text-muted">Projects will appear here once added.</p>
            </div>
          )}
        </section>

        <section
          id={skillsId}
          aria-labelledby={`${uid}-skills-title`}
          className="mt-3 min-w-0 scroll-mt-8 rounded-2xl border border-line bg-panel p-6 @xl:p-8 @3xl:col-span-3"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-mono text-[10px] tracking-[0.18em] text-muted">MY TOOLKIT</p>
              <SectionTitle
                id={`${uid}-skills-title`}
                className="mt-2 font-display text-2xl font-semibold tracking-tight"
              >
                Technologies I work with
              </SectionTitle>
            </div>
            <PortfolioIcon name="layers" className="size-6 shrink-0 text-accent" />
          </div>
          {hasSkills ? (
            <div className="mt-7 grid min-w-0 gap-7 @3xl:grid-cols-3">
              {SKILL_CATEGORIES.filter((category) => skills[category]?.length).map((category) => (
                <div key={category} className="min-w-0">
                  <SubsectionTitle className="mb-3 text-xs font-semibold text-muted">
                    {SKILL_LABELS[category]}
                  </SubsectionTitle>
                  <ul
                    aria-label={`${SKILL_LABELS[category]} skills`}
                    className="flex flex-wrap gap-2"
                  >
                    {skills[category].map((skill) => (
                      <li
                        key={skill}
                        className="max-w-full rounded-lg border border-line-soft bg-canvas px-3 py-2 font-mono text-xs leading-5 text-label"
                      >
                        {skill}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-5 text-sm leading-7 text-muted">Skills will appear here once added.</p>
          )}
        </section>
      </div>

      <footer className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-line-soft pt-5 font-mono text-[10px] leading-6 text-muted">
        <span>{name} / Portfolio</span>
        <span>Built with CodeFolio</span>
      </footer>
    </article>
  );
}
