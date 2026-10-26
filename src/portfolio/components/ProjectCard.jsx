import { useState } from 'react';
import { isWebUrl } from '../../../shared/profile.js';
import PortfolioIcon from './PortfolioIcon.jsx';
import PortfolioLink from './PortfolioLink.jsx';

function ProjectImage({ project, featured, wide }) {
  const [failed, setFailed] = useState(false);
  const hasImage = Boolean(project.screenshot && isWebUrl(project.screenshot));
  return (
    <div
      className={`relative grid aspect-[16/10] w-full place-items-center overflow-hidden border-b border-line-soft bg-subtle ${wide ? '@3xl:aspect-auto @3xl:h-full @3xl:min-h-72 @3xl:border-r @3xl:border-b-0' : ''}`}
    >
      {hasImage && !failed ? (
        <img
          src={project.screenshot}
          alt={`${project.title} project screenshot`}
          width="960"
          height="600"
          loading={featured ? 'eager' : 'lazy'}
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
          className="h-full w-full object-contain"
        />
      ) : (
        <div className="flex max-w-full flex-col items-center gap-4 p-6 text-center text-muted">
          <div className="grid size-14 place-items-center rounded-2xl border border-line bg-panel">
            <PortfolioIcon name="code" className="size-6" />
          </div>
          <p className="text-xs">{failed ? 'Screenshot unavailable' : 'Project preview'}</p>
        </div>
      )}
      {featured && (
        <span className="absolute top-4 left-4 rounded-full border border-line bg-panel px-3 py-1.5 text-[10px] font-bold tracking-wider text-label">
          FEATURED PROJECT
        </span>
      )}
    </div>
  );
}

export default function ProjectCard({
  project,
  featured = false,
  wide = false,
  headingAs: Heading = 'h3',
}) {
  return (
    <article
      className={`group flex min-w-0 flex-col overflow-hidden rounded-2xl border border-line bg-panel motion-safe:transition-[border-color,box-shadow] motion-safe:duration-200 hover:border-line-accent hover:shadow-lg hover:shadow-shadow ${wide ? '@xl:col-span-2 @3xl:grid @3xl:grid-cols-2' : ''}`}
    >
      <ProjectImage key={project.screenshot} project={project} featured={featured} wide={wide} />
      <div className="flex flex-1 flex-col p-5 @xl:p-7">
        <Heading
          className={`font-display font-semibold tracking-tight text-ink ${featured ? 'text-2xl @xl:text-3xl' : 'text-xl'}`}
        >
          {project.title}
        </Heading>
        <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-muted">
          {project.description}
        </p>
        {project.techStack?.length > 0 && (
          <ul aria-label={`${project.title} technologies`} className="mt-5 flex flex-wrap gap-2">
            {project.techStack.map((technology) => (
              <li
                key={technology}
                className="max-w-full rounded-md border border-line-soft bg-canvas px-2.5 py-1 font-mono text-[11px] leading-5 text-label"
              >
                {technology}
              </li>
            ))}
          </ul>
        )}
        {(project.liveLink || project.repoLink) && (
          <div className="mt-auto flex flex-wrap gap-x-5 gap-y-2 pt-6 text-xs font-semibold text-ink">
            <PortfolioLink
              href={project.liveLink}
              label={`Live demo for ${project.title} (opens in a new tab)`}
            >
              Live demo
            </PortfolioLink>
            <PortfolioLink
              href={project.repoLink}
              icon="code"
              label={`Source code for ${project.title} (opens in a new tab)`}
            >
              Source code
            </PortfolioLink>
          </div>
        )}
      </div>
    </article>
  );
}
