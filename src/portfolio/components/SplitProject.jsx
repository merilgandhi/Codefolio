import { useState } from 'react';
import { isWebUrl } from '../../../shared/profile.js';
import PortfolioIcon from './PortfolioIcon.jsx';
import PortfolioLink from './PortfolioLink.jsx';

function Screenshot({ project, first }) {
  const [failed, setFailed] = useState(false);
  if (!project.screenshot || !isWebUrl(project.screenshot)) return null;
  return (
    <div className="mt-5 grid aspect-video w-full place-items-center overflow-hidden rounded-lg border border-line-soft bg-subtle">
      {failed ? (
        <div className="flex flex-col items-center gap-3 p-5 text-muted">
          <PortfolioIcon name="code" className="size-6" />
          <p className="text-xs">Screenshot unavailable</p>
        </div>
      ) : (
        <img
          src={project.screenshot}
          alt={`${project.title} project screenshot`}
          width="960"
          height="540"
          loading={first ? 'eager' : 'lazy'}
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
          className="h-full w-full object-contain"
        />
      )}
    </div>
  );
}

export default function SplitProject({ project, index, headingAs: Heading = 'h3' }) {
  return (
    <article className="min-w-0 border-b border-line-soft py-8 first:pt-0 last:border-b-0 last:pb-0">
      <div className="flex items-baseline gap-4">
        <span aria-hidden="true" className="shrink-0 font-mono text-xs text-muted">
          {String(index + 1).padStart(2, '0')}
        </span>
        <Heading className="min-w-0 font-display text-xl leading-snug font-semibold tracking-tight @xl:text-2xl">
          {project.title}
        </Heading>
      </div>
      <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-muted">{project.description}</p>
      <Screenshot key={project.screenshot} project={project} first={index === 0} />
      {project.techStack?.length > 0 && (
        <ul aria-label={`${project.title} technologies`} className="mt-5 flex flex-wrap gap-2">
          {project.techStack.map((technology) => (
            <li
              key={technology}
              className="max-w-full rounded-md bg-soft px-2.5 py-1.5 font-mono text-[11px] leading-5 text-label"
            >
              {technology}
            </li>
          ))}
        </ul>
      )}
      {(project.repoLink || project.liveLink) && (
        <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-xs font-semibold">
          <PortfolioLink
            href={project.repoLink}
            icon="code"
            label={`Source code for ${project.title} (opens in a new tab)`}
          >
            Source code
          </PortfolioLink>
          <PortfolioLink
            href={project.liveLink}
            label={`Live demo for ${project.title} (opens in a new tab)`}
          >
            Live demo
          </PortfolioLink>
        </div>
      )}
    </article>
  );
}
