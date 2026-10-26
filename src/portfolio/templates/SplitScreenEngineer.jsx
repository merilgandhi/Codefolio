import { useId } from 'react';
import { SKILL_CATEGORIES } from '../../../shared/portfolio.js';
import { SKILL_LABELS } from '../../../shared/skills.js';
import { isWebUrl } from '../../../shared/profile.js';
import PortfolioIcon from '../components/PortfolioIcon.jsx';
import PortfolioLink, { focusStyle } from '../components/PortfolioLink.jsx';
import SplitProject from '../components/SplitProject.jsx';
import ProBadge from '../../components/ProBadge.jsx';

// Uses the same public-data contract as Bento Developer; fetching belongs to the caller.
export default function SplitScreenEngineer({ portfolio, embedded = false, contactHref }) {
  const uid = useId();
  const { username, profile, projects = [], skills = {} } = portfolio;
  const name = profile.name || username;
  const links = (profile.socialLinks || []).filter((link) => link.url && isWebUrl(link.url));
  const hasResume = Boolean(profile.resumeUrl && isWebUrl(profile.resumeUrl));
  const categories = SKILL_CATEGORIES.filter((category) => skills[category]?.length);
  const Title = embedded ? 'h2' : 'h1';
  const SectionTitle = embedded ? 'h3' : 'h2';
  const SubsectionTitle = embedded ? 'h4' : 'h3';
  const titleId = `${uid}-split-name`;
  const workId = `${uid}-split-work`;
  const skillsId = `${uid}-split-skills`;
  const linksId = `${uid}-split-links`;

  return (
    <article
      aria-labelledby={titleId}
      className="@container min-w-0 rounded-3xl border border-line bg-panel p-4 text-ink [overflow-wrap:anywhere] sm:p-8"
    >
      <div className="grid min-w-0 gap-10 @3xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.3fr)] @3xl:items-start @3xl:gap-12">
        <aside
          aria-label="Developer profile"
          className="min-w-0 rounded-2xl bg-soft p-6 @xl:p-7 @3xl:sticky @3xl:top-8 @3xl:max-h-[calc(100dvh-4rem)] @3xl:overflow-y-auto @3xl:overscroll-contain"
        >
          <div className="flex items-center gap-2 font-mono text-[10px] tracking-[0.16em] text-muted">
            <PortfolioIcon name="code" className="size-4 shrink-0" />
            DEVELOPER PORTFOLIO
          </div>
          <Title
            id={titleId}
            className="mt-7 scroll-mt-8 font-display text-4xl leading-[1.12] font-semibold tracking-[-0.04em] @xl:text-5xl"
          >
            {name}
          </Title>
          <div className="mt-3 flex min-w-0 flex-wrap items-center gap-3">
            <p className="min-w-0 font-mono text-xs text-muted">@{username}</p>
            {portfolio.isPro === true && <ProBadge />}
          </div>
          {profile.bio && (
            <p className="mt-6 whitespace-pre-wrap text-sm leading-7 text-muted">{profile.bio}</p>
          )}
          <nav aria-label="Portfolio sections" className="mt-6 flex flex-wrap gap-x-5 gap-y-1">
            {[
              [workId, 'Work'],
              [skillsId, 'Skills'],
              [linksId, 'Links'],
              ...(contactHref ? [[contactHref.slice(1), 'Contact']] : []),
            ].map(([id, label], index) => (
              <a
                key={id}
                href={`#${id}`}
                className={`group inline-flex min-h-11 items-center gap-3 rounded-md text-xs font-semibold hover:text-success ${focusStyle}`}
              >
                <span aria-hidden="true" className="font-mono text-[10px] font-normal text-muted">
                  0{index + 1}
                </span>
                <span>{label}</span>
                <span
                  aria-hidden="true"
                  className="hidden h-px w-5 bg-line-accent motion-safe:transition-[width] motion-safe:duration-200 group-hover:w-9 @xl:inline-block"
                />
              </a>
            ))}
          </nav>
          {hasResume && (
            <PortfolioLink
              href={profile.resumeUrl}
              icon="document"
              className="mt-6 w-full rounded-xl bg-action px-4 py-3 text-xs font-semibold text-action-ink hover:bg-action-hover"
            >
              View résumé
            </PortfolioLink>
          )}
          <section
            id={linksId}
            aria-labelledby={`${uid}-split-links-title`}
            className="mt-8 scroll-mt-8 border-t border-line-accent pt-6"
          >
            <SectionTitle
              id={`${uid}-split-links-title`}
              className="font-mono text-[10px] font-medium tracking-[0.16em] text-muted"
            >
              FIND ME ONLINE
            </SectionTitle>
            {links.length > 0 ? (
              <ul className="mt-3 space-y-1">
                {links.map((link, index) => (
                  <li key={`${link.url}-${index}`}>
                    <PortfolioLink href={link.url} className="w-full py-2 text-xs font-medium">
                      {link.label}
                    </PortfolioLink>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-xs leading-6 text-muted">
                Social links will appear here once added.
              </p>
            )}
          </section>
        </aside>

        <div className="min-w-0 py-2 @3xl:py-1">
          <section
            id={workId}
            aria-labelledby={`${uid}-split-work-title`}
            className="min-w-0 scroll-mt-8"
          >
            <div className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-line pb-5">
              <div>
                <p className="font-mono text-[10px] tracking-[0.16em] text-muted">
                  01 / SELECTED WORK
                </p>
                <SectionTitle
                  id={`${uid}-split-work-title`}
                  className="mt-3 font-display text-2xl font-semibold tracking-tight @xl:text-3xl"
                >
                  Engineering in practice.
                </SectionTitle>
              </div>
              <span className="font-mono text-[11px] text-muted">
                {String(projects.length).padStart(2, '0')}{' '}
                {projects.length === 1 ? 'project' : 'projects'}
              </span>
            </div>
            {projects.length > 0 ? (
              <div>
                {projects.map((project, index) => (
                  <SplitProject
                    key={project.id || index}
                    project={project}
                    index={index}
                    headingAs={embedded ? 'h4' : 'h3'}
                  />
                ))}
              </div>
            ) : (
              <div className="border-b border-line-soft pb-8">
                <PortfolioIcon name="code" className="size-6 text-accent" />
                <p className="mt-4 font-display text-lg font-semibold">Room for your next idea.</p>
                <p className="mt-2 text-sm leading-7 text-muted">
                  Projects will appear here once added.
                </p>
              </div>
            )}
          </section>

          <section
            id={skillsId}
            aria-labelledby={`${uid}-split-skills-title`}
            className="mt-12 min-w-0 scroll-mt-8"
          >
            <div className="border-b border-line pb-5">
              <p className="font-mono text-[10px] tracking-[0.16em] text-muted">
                02 / TECHNICAL TOOLKIT
              </p>
              <SectionTitle
                id={`${uid}-split-skills-title`}
                className="mt-3 font-display text-2xl font-semibold tracking-tight @xl:text-3xl"
              >
                Skills & technologies
              </SectionTitle>
            </div>
            {categories.length > 0 ? (
              <div className="mt-6 space-y-6">
                {categories.map((category) => (
                  <div key={category} className="min-w-0">
                    <SubsectionTitle className="text-xs font-semibold text-muted">
                      {SKILL_LABELS[category]}
                    </SubsectionTitle>
                    <ul
                      aria-label={`${SKILL_LABELS[category]} skills`}
                      className="mt-3 flex flex-wrap gap-2"
                    >
                      {skills[category].map((skill) => (
                        <li
                          key={skill}
                          className="max-w-full rounded-md border border-line-soft px-3 py-2 font-mono text-xs leading-5 text-label"
                        >
                          {skill}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-5 text-sm leading-7 text-muted">
                Skills will appear here once added.
              </p>
            )}
          </section>
        </div>
      </div>
      <footer className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-line-soft pt-5 font-mono text-[10px] leading-6 text-muted">
        <span>{name} / Portfolio</span>
        <span>Built with CodeFolio</span>
      </footer>
    </article>
  );
}
