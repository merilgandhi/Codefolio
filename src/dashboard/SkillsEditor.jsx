import { useEffect, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { api } from '../lib/api.js';
import { useAuth } from '../auth/AuthContext.jsx';
import { SKILL_CATEGORIES } from '../../shared/portfolio.js';
import { MAX_SKILLS_PER_CATEGORY, SKILL_LABELS, validateSkills } from '../../shared/skills.js';

const blank = { frontend: '', backend: '', devops: '' };
const placeholders = {
  frontend: 'React, TypeScript, Tailwind CSS',
  backend: 'Node.js, Express, MongoDB',
  devops: 'Docker, GitHub Actions, AWS',
};
const textValues = (skills) =>
  Object.fromEntries(SKILL_CATEGORIES.map((category) => [category, skills[category].join(', ')]));
const listValues = (values) =>
  Object.fromEntries(
    SKILL_CATEGORIES.map((category) => [
      category,
      values[category].trim() ? values[category].split(',').map((value) => value.trim()) : [],
    ]),
  );
const buttonStyle =
  'cursor-pointer rounded-lg border border-line px-4 py-2.5 text-xs font-medium hover:bg-soft focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus disabled:cursor-not-allowed disabled:opacity-50';

export default function SkillsEditor({ onDirtyChange, onBusyChange, onPreviewChange }) {
  const { sessionExpired } = useAuth();
  const [loadState, setLoadState] = useState('loading');
  const [loadError, setLoadError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [version, setVersion] = useState(null);
  const [saved, setSaved] = useState(false);
  const [conflict, setConflict] = useState(false);
  const [confirmReload, setConfirmReload] = useState(false);
  const {
    register,
    control,
    reset,
    setValue,
    setError,
    clearErrors,
    handleSubmit,
    formState: { errors, isDirty, isSubmitting },
  } = useForm({ defaultValues: blank });
  const values = useWatch({ control });
  useEffect(() => {
    onPreviewChange?.(loadState === 'ready' ? { skills: values } : null);
  }, [values, loadState, onPreviewChange]);
  useEffect(() => {
    onDirtyChange(isDirty);
  }, [isDirty, onDirtyChange]);
  useEffect(() => {
    onBusyChange(isSubmitting);
  }, [isSubmitting, onBusyChange]);
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
    api('/skills', { signal: controller.signal })
      .then((result) => {
        if (controller.signal.aborted) return;
        reset(textValues(result.skills));
        setVersion(result.version);
        setConflict(false);
        setLoadState('ready');
      })
      .catch((failure) => {
        if (controller.signal.aborted) return;
        if (failure.status === 401) sessionExpired();
        else {
          setLoadError(failure.message);
          setLoadState('error');
        }
      });
    return () => controller.abort();
  }, [attempt, reset, sessionExpired]);

  const submit = async (input) => {
    setSaved(false);
    clearErrors();
    const result = validateSkills(listValues(input));
    if (Object.keys(result.fields).length) {
      for (const [field, message] of Object.entries(result.fields))
        setError(field, { message }, { shouldFocus: true });
      return;
    }
    try {
      const response = await api('/skills', {
        method: 'PUT',
        body: { skills: result.skills, version },
      });
      reset(textValues(response.skills));
      setVersion(response.version);
      setConflict(false);
      setSaved(true);
    } catch (failure) {
      if (failure.status === 401) {
        sessionExpired();
        return;
      }
      if (failure.status === 409) setConflict(true);
      for (const [field, message] of Object.entries(failure.fields || {}))
        setError(field, { message });
      setError('root', { message: failure.message });
    }
  };
  const changeList = (category, value) => {
    setValue(category, value, { shouldDirty: true, shouldTouch: true });
    clearErrors(category);
    setSaved(false);
  };
  const reload = () => {
    setSaved(false);
    setConfirmReload(false);
    setAttempt((value) => value + 1);
  };
  if (loadState === 'loading')
    return (
      <p role="status" className="mt-8 text-sm text-muted">
        Loading your saved skills…
      </p>
    );
  if (loadState === 'error')
    return (
      <section className="mt-8 rounded-xl border border-danger-line p-6">
        <p role="alert" className="text-sm text-danger">
          {loadError}
        </p>
        <button onClick={reload} className={`${buttonStyle} mt-4`}>
          Try loading again
        </button>
      </section>
    );

  return (
    <section
      className="mt-8 rounded-xl border border-line bg-panel p-5 sm:p-8"
      aria-labelledby="skills-title"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 id="skills-title" className="font-display text-xl font-semibold tracking-tight">
            Your skills
          </h2>
          <p className="mt-2 text-xs leading-6 text-quiet">
            Organize the technologies you work with. Keep each category focused on what you know.
          </p>
        </div>
        <span className="rounded-full bg-soft px-3 py-1 text-[11px] text-success">
          {isDirty ? 'Unsaved changes' : 'Up to date'}
        </span>
      </div>
      <form
        onSubmit={handleSubmit(submit)}
        noValidate
        aria-busy={isSubmitting}
        className="mt-7 space-y-6"
        onChange={() => setSaved(false)}
      >
        <fieldset disabled={isSubmitting} className="min-w-0 space-y-5">
          {SKILL_CATEGORIES.map((category) => {
            const entries = (values[category] || '')
              .split(',')
              .map((value, index) => ({ value: value.trim(), index }))
              .filter((item) => item.value);
            return (
              <div
                key={category}
                className="rounded-xl border border-line-soft bg-canvas p-4 sm:p-5"
              >
                <div className="flex items-center justify-between gap-3">
                  <label
                    htmlFor={`skills-${category}`}
                    className="font-display text-base font-semibold"
                  >
                    {SKILL_LABELS[category]}
                  </label>
                  <span className="text-[11px] text-quiet">
                    {entries.length} / {MAX_SKILLS_PER_CATEGORY}
                  </span>
                </div>
                <textarea
                  id={`skills-${category}`}
                  rows={3}
                  maxLength={2100}
                  placeholder={placeholders[category]}
                  aria-invalid={Boolean(errors[category])}
                  aria-describedby={`skills-${category}-hint${errors[category] ? ` skills-${category}-error` : ''}`}
                  {...register(category)}
                  className="mt-3 w-full resize-y rounded-lg border border-line bg-field px-3.5 py-3 text-sm text-ink placeholder:text-quiet focus:border-focus focus:outline-2 focus:outline-offset-2 focus:outline-focus-soft disabled:opacity-60"
                />
                <p id={`skills-${category}-hint`} className="mt-2 text-[11px] leading-5 text-quiet">
                  Separate skills with commas. Up to 40 distinct entries, each at most 50
                  characters. An empty category is allowed.
                </p>
                {errors[category] && (
                  <p
                    id={`skills-${category}-error`}
                    role="alert"
                    className="mt-2 text-xs text-danger"
                  >
                    {errors[category].message}
                  </p>
                )}
                {entries.length > 0 ? (
                  <div
                    className="mt-3 flex flex-wrap gap-2"
                    aria-label={`${SKILL_LABELS[category]} skill tags`}
                  >
                    {entries.map(({ value, index }) => (
                      <span
                        key={`${index}-${value}`}
                        className="inline-flex max-w-full items-center gap-1 rounded-lg border border-line-accent bg-soft pl-2.5 text-xs text-success"
                      >
                        <span className="min-w-0 break-words [overflow-wrap:anywhere]">
                          {value}
                        </span>
                        <button
                          type="button"
                          aria-label={`Remove ${value} from ${SKILL_LABELS[category]}`}
                          onClick={() =>
                            changeList(
                              category,
                              values[category]
                                .split(',')
                                .filter((_, slot) => slot !== index)
                                .map((skill) => skill.trim())
                                .join(', '),
                            )
                          }
                          className="min-h-8 min-w-8 shrink-0 cursor-pointer rounded-r-lg text-base hover:bg-chip focus-visible:outline-2 focus-visible:outline-focus"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 text-xs text-quiet">
                    No {SKILL_LABELS[category]} skills added yet.
                  </p>
                )}
                <button
                  type="button"
                  disabled={!values[category]}
                  className={`${buttonStyle} mt-3`}
                  onClick={() => changeList(category, '')}
                >
                  Clear {SKILL_LABELS[category]}
                </button>
              </div>
            );
          })}
        </fieldset>
        {errors.root && (
          <p
            role="alert"
            className="rounded-lg border border-danger-line bg-danger-bg p-3 text-sm text-danger"
          >
            {errors.root.message}
          </p>
        )}
        {confirmReload && (
          <div className="rounded-lg border border-line bg-soft p-4 text-sm">
            <p>Discard unsaved skill changes and load the saved lists?</p>
            <div className="mt-3 flex flex-wrap gap-3">
              <button type="button" onClick={reload} className={buttonStyle}>
                Discard and reload
              </button>
              <button type="button" onClick={() => setConfirmReload(false)} className={buttonStyle}>
                Keep editing
              </button>
            </div>
          </div>
        )}
        <div className="flex flex-wrap items-center gap-3 border-t border-line-soft pt-6">
          <button
            type="submit"
            disabled={isSubmitting || !isDirty || conflict}
            className="cursor-pointer rounded-lg bg-action px-5 py-3 text-sm font-semibold text-action-ink hover:bg-action-hover focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? 'Saving…' : 'Save skills'}
          </button>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => (isDirty ? setConfirmReload(true) : reload())}
            className={buttonStyle}
          >
            Reload saved skills
          </button>
          {saved && (
            <p role="status" className="text-xs font-medium text-success">
              Skills saved.
            </p>
          )}
        </div>
      </form>
    </section>
  );
}
