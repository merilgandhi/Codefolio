import { useEffect, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { api } from '../lib/api.js';
import { useAuth } from '../auth/AuthContext.jsx';
import { MAX_PROJECTS, validateProject } from '../../shared/projects.js';
import { previewProjects } from './draftPortfolio.js';

const blank = {
  title: '',
  description: '',
  techStackText: '',
  repoLink: '',
  liveLink: '',
  screenshot: '',
};
const inputStyle =
  'mt-2 w-full rounded-lg border border-line bg-field px-3.5 py-3 text-sm text-ink placeholder:text-quiet focus:border-focus focus:outline-2 focus:outline-offset-2 focus:outline-focus-soft disabled:opacity-60';
const buttonStyle =
  'cursor-pointer rounded-lg border border-line px-4 py-2.5 text-xs font-medium hover:bg-soft focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus disabled:cursor-not-allowed disabled:opacity-50';
const primaryStyle =
  'cursor-pointer rounded-lg bg-action px-5 py-3 text-sm font-semibold text-action-ink hover:bg-action-hover focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus disabled:cursor-not-allowed disabled:opacity-50';

function Screenshot({ project }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [project.screenshot]);
  return (
    <div className="grid aspect-video w-full place-items-center overflow-hidden rounded-lg border border-line bg-soft text-xs text-muted">
      {project.screenshot && !failed ? (
        <img
          src={project.screenshot}
          alt={`${project.title} screenshot`}
          width="960"
          height="540"
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <span>{failed ? 'Screenshot unavailable' : 'No screenshot added'}</span>
      )}
    </div>
  );
}

export default function ProjectsEditor({ onDirtyChange, onBusyChange, onPreviewChange }) {
  const { sessionExpired } = useAuth();
  const [projects, setProjects] = useState([]);
  const [version, setVersion] = useState(null);
  const [loadState, setLoadState] = useState('loading');
  const [attempt, setAttempt] = useState(0);
  const [error, setErrorMessage] = useState('');
  const [notice, setNotice] = useState('');
  const [conflict, setConflict] = useState(false);
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [pending, setPending] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    clearErrors,
    formState: { errors, isDirty, isSubmitting },
  } = useForm({ defaultValues: blank });
  const values = useWatch({ control });
  useEffect(() => {
    if (loadState !== 'ready') {
      onPreviewChange?.(null);
      return;
    }
    onPreviewChange?.({
      projects: previewProjects(projects, values, { open, dirty: isDirty, selectedId }),
    });
  }, [projects, values, selectedId, open, isDirty, loadState, onPreviewChange]);
  const busy = isSubmitting || deleting;
  useEffect(() => {
    onDirtyChange(isDirty);
  }, [isDirty, onDirtyChange]);
  useEffect(() => {
    onBusyChange(busy);
  }, [busy, onBusyChange]);
  useEffect(() => {
    if (!isDirty) return;
    const preventUnload = (event) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', preventUnload);
    return () => window.removeEventListener('beforeunload', preventUnload);
  }, [isDirty]);

  useEffect(() => {
    const controller = new AbortController();
    setLoadState('loading');
    api('/projects', { signal: controller.signal })
      .then((result) => {
        if (controller.signal.aborted) return;
        setProjects(result.projects);
        setVersion(result.version);
        setConflict(false);
        setOpen(false);
        setSelectedId(null);
        setDeleteId(null);
        reset(blank);
        setErrorMessage('');
        setLoadState('ready');
      })
      .catch((failure) => {
        if (controller.signal.aborted) return;
        if (failure.status === 401) sessionExpired();
        else {
          setErrorMessage(failure.message);
          setLoadState('error');
        }
      });
    return () => controller.abort();
  }, [attempt, reset, sessionExpired]);

  const act = (action) => {
    setPending(null);
    setNotice('');
    setErrorMessage('');
    setDeleteId(null);
    if (action.type === 'reload') {
      setAttempt((value) => value + 1);
      return;
    }
    if (action.type === 'cancel') {
      reset(blank);
      setOpen(false);
      setSelectedId(null);
      return;
    }
    const project = action.project;
    reset(
      project
        ? {
            title: project.title,
            description: project.description,
            techStackText: project.techStack.join(', '),
            repoLink: project.repoLink,
            liveLink: project.liveLink,
            screenshot: project.screenshot,
          }
        : blank,
    );
    setSelectedId(project?.id || null);
    setOpen(true);
  };
  const requestAction = (action) => (isDirty ? setPending(action) : act(action));
  const apply = (result) => {
    setProjects(result.projects);
    setVersion(result.version);
  };
  const handleFailure = (failure) => {
    if (failure.status === 401) {
      sessionExpired();
      return;
    }
    if ([404, 409].includes(failure.status)) setConflict(true);
    setErrorMessage(failure.message);
  };
  const save = async (values) => {
    clearErrors();
    setErrorMessage('');
    setNotice('');
    const result = validateProject({
      title: values.title,
      description: values.description,
      techStack: values.techStackText.trim()
        ? values.techStackText.split(',').map((tag) => tag.trim())
        : [],
      repoLink: values.repoLink,
      liveLink: values.liveLink,
      screenshot: values.screenshot,
    });
    if (Object.keys(result.fields).length) {
      for (const [field, message] of Object.entries(result.fields))
        setError(
          field === 'techStack' ? 'techStackText' : field,
          { message },
          { shouldFocus: true },
        );
      return;
    }
    try {
      const response = await api(selectedId ? `/projects/${selectedId}` : '/projects', {
        method: selectedId ? 'PUT' : 'POST',
        body: { project: result.project, version },
      });
      apply(response);
      reset(blank);
      setOpen(false);
      setSelectedId(null);
      setNotice(selectedId ? 'Project updated.' : 'Project added.');
    } catch (failure) {
      for (const [field, message] of Object.entries(failure.fields || {}))
        setError(field === 'techStack' ? 'techStackText' : field, { message });
      handleFailure(failure);
    }
  };
  const remove = async () => {
    setDeleting(true);
    setErrorMessage('');
    setNotice('');
    try {
      apply(await api(`/projects/${deleteId}`, { method: 'DELETE', body: { version } }));
      if (selectedId === deleteId) {
        reset(blank);
        setOpen(false);
        setSelectedId(null);
      }
      setDeleteId(null);
      setNotice('Project deleted.');
    } catch (failure) {
      handleFailure(failure);
    } finally {
      setDeleting(false);
    }
  };

  if (loadState === 'loading')
    return (
      <p role="status" className="mt-8 text-sm text-muted">
        Loading your saved projects…
      </p>
    );
  if (loadState === 'error')
    return (
      <section className="mt-8 rounded-xl border border-danger-line p-6">
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
        <button onClick={() => act({ type: 'reload' })} className={`${buttonStyle} mt-4`}>
          Try loading again
        </button>
      </section>
    );

  return (
    <section
      className="mt-8 rounded-xl border border-line bg-panel p-5 sm:p-8"
      aria-labelledby="projects-title"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 id="projects-title" className="font-display text-xl font-semibold tracking-tight">
            Your projects
          </h2>
          <p className="mt-2 text-xs leading-6 text-quiet">
            Show what you’ve built. Add details, technologies, and links.
          </p>
        </div>
        <span className="rounded-full bg-soft px-3 py-1 text-[11px] text-success">
          {projects.length} / {MAX_PROJECTS}
        </span>
      </div>
      <div className="mt-5 flex flex-wrap gap-3">
        <button
          disabled={busy || conflict || projects.length >= MAX_PROJECTS}
          className={buttonStyle}
          onClick={() => requestAction({ type: 'new' })}
        >
          + Add project
        </button>
        <button
          disabled={busy}
          className={buttonStyle}
          onClick={() => requestAction({ type: 'reload' })}
        >
          Reload saved projects
        </button>
        {isDirty && <span className="self-center text-xs text-muted">Unsaved changes</span>}
      </div>
      {notice && (
        <p role="status" className="mt-4 rounded-lg bg-soft p-3 text-sm text-success">
          {notice}
        </p>
      )}
      {error && (
        <p
          role="alert"
          className="mt-4 rounded-lg border border-danger-line bg-danger-bg p-3 text-sm text-danger"
        >
          {error}
        </p>
      )}
      {pending && (
        <div className="mt-4 rounded-lg border border-line bg-soft p-4 text-sm">
          <p>Discard your unsaved project changes?</p>
          <div className="mt-3 flex flex-wrap gap-3">
            <button className={buttonStyle} onClick={() => act(pending)}>
              Discard changes
            </button>
            <button className={buttonStyle} onClick={() => setPending(null)}>
              Keep editing
            </button>
          </div>
        </div>
      )}
      {open && (
        <form
          className="mt-6 space-y-5 rounded-xl border border-line bg-canvas p-4 sm:p-6"
          onSubmit={handleSubmit(save)}
          noValidate
          aria-busy={isSubmitting}
          onChange={() => setNotice('')}
        >
          <h3 className="font-display text-lg font-semibold">
            {selectedId ? 'Edit project' : 'New project'}
          </h3>
          <fieldset disabled={busy} className="space-y-5">
            {[
              ['title', 'Project title', 'text', 120, 'A useful developer tool'],
              [
                'description',
                'Description',
                'textarea',
                3000,
                'What does it do, and what did you build?',
              ],
              ['techStackText', 'Tech stack', 'text', 1040, 'React, Node.js, MongoDB'],
              ['repoLink', 'Repository link', 'url', 2048, 'https://github.com/you/project'],
              ['liveLink', 'Live link', 'url', 2048, 'https://your-project.example'],
              ['screenshot', 'Screenshot URL', 'url', 2048, 'https://example.com/project.webp'],
            ].map(([name, label, type, maxLength, placeholder]) => (
              <div key={name}>
                <label htmlFor={`project-${name}`} className="text-xs font-semibold text-label">
                  {label}
                  {['title', 'description'].includes(name) ? ' *' : ''}
                </label>
                {type === 'textarea' ? (
                  <textarea
                    id={`project-${name}`}
                    rows={4}
                    maxLength={maxLength}
                    placeholder={placeholder}
                    className={`${inputStyle} resize-y`}
                    aria-invalid={Boolean(errors[name])}
                    aria-describedby={errors[name] ? `project-${name}-error` : undefined}
                    {...register(name)}
                  />
                ) : (
                  <input
                    id={`project-${name}`}
                    type={type}
                    maxLength={maxLength}
                    placeholder={placeholder}
                    className={inputStyle}
                    aria-invalid={Boolean(errors[name])}
                    aria-describedby={errors[name] ? `project-${name}-error` : undefined}
                    {...register(name)}
                  />
                )}
                {name === 'techStackText' && (
                  <p className="mt-2 text-[11px] leading-5 text-quiet">
                    Separate technologies with commas. Up to 20 distinct entries, each at most 50
                    characters.
                  </p>
                )}
                {name === 'screenshot' && (
                  <p className="mt-2 text-[11px] leading-5 text-quiet">
                    Optional public image URL. Uploading files is not supported here.
                  </p>
                )}
                {errors[name] && (
                  <p id={`project-${name}-error`} role="alert" className="mt-2 text-xs text-danger">
                    {errors[name].message}
                  </p>
                )}
              </div>
            ))}
          </fieldset>
          <div className="flex flex-wrap gap-3">
            <button type="submit" className={primaryStyle} disabled={busy || !isDirty || conflict}>
              {isSubmitting ? 'Saving…' : selectedId ? 'Save project' : 'Create project'}
            </button>
            <button
              type="button"
              disabled={busy}
              className={buttonStyle}
              onClick={() => requestAction({ type: 'cancel' })}
            >
              Cancel editing
            </button>
          </div>
        </form>
      )}
      {projects.length === 0 && !open && (
        <div className="mt-6 rounded-lg border border-dashed border-line p-6 text-sm leading-7 text-quiet">
          No projects yet. Add your first project to start telling the story of your work.
        </div>
      )}
      <div className="mt-6 grid gap-5 @lg/editor:grid-cols-2">
        {projects.map((project) => (
          <article key={project.id} className="min-w-0 rounded-xl border border-line p-4">
            <Screenshot project={project} />
            <h3 className="mt-4 font-display text-base font-semibold break-words">
              {project.title}
            </h3>
            <p className="mt-2 text-xs leading-6 whitespace-pre-wrap text-quiet [overflow-wrap:anywhere]">
              {project.description}
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {project.techStack.map((tag) => (
                <span
                  key={tag.toLowerCase()}
                  className="max-w-full rounded bg-soft px-2 py-1 text-[10px] break-words text-success"
                >
                  {tag}
                </span>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-4 text-xs text-success">
              {project.repoLink && (
                <a
                  href={project.repoLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-4"
                >
                  Repository ↗
                </a>
              )}
              {project.liveLink && (
                <a
                  href={project.liveLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-4"
                >
                  Live project ↗
                </a>
              )}
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                disabled={busy || conflict}
                aria-label={`Edit ${project.title}`}
                className={buttonStyle}
                onClick={() => requestAction({ type: 'edit', project })}
              >
                Edit
              </button>
              <button
                disabled={busy || isDirty || conflict}
                aria-label={`Delete ${project.title}`}
                className={`${buttonStyle} text-danger`}
                onClick={() => setDeleteId(project.id)}
              >
                Delete
              </button>
            </div>
            {deleteId === project.id && (
              <div className="mt-4 rounded-lg border border-danger-line bg-danger-bg p-3 text-xs leading-6">
                <p>Delete this saved project? This action cannot be undone.</p>
                <div className="mt-3 flex flex-wrap gap-3">
                  <button disabled={busy} className={`${buttonStyle} text-danger`} onClick={remove}>
                    {deleting ? 'Deleting…' : 'Confirm delete'}
                  </button>
                  <button disabled={busy} className={buttonStyle} onClick={() => setDeleteId(null)}>
                    Keep project
                  </button>
                </div>
              </div>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
