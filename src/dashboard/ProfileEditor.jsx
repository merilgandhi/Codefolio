import { useEffect, useState } from 'react';
import { useFieldArray, useForm, useWatch } from 'react-hook-form';
import { api } from '../lib/api.js';
import { useAuth } from '../auth/AuthContext.jsx';
import { validateProfile } from '../../shared/profile.js';

const inputStyle =
  'mt-2 w-full rounded-lg border border-line bg-field px-3.5 py-3 text-sm text-ink placeholder:text-quiet focus:border-focus focus:outline-2 focus:outline-offset-2 focus:outline-focus-soft disabled:opacity-60';
const buttonStyle =
  'cursor-pointer rounded-lg border border-line px-4 py-2.5 text-xs font-medium hover:bg-soft focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus disabled:cursor-not-allowed disabled:opacity-50';

export default function ProfileEditor({ onDirtyChange, onBusyChange, onPreviewChange }) {
  const { updateName, sessionExpired } = useAuth();
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
    handleSubmit,
    reset,
    setError,
    clearErrors,
    formState: { errors, isDirty, isSubmitting },
  } = useForm({
    defaultValues: { name: '', bio: '', resumeUrl: '', socialLinks: [] },
  });
  const { fields, append, remove } = useFieldArray({
    name: 'socialLinks',
    control,
  });
  const values = useWatch({ control });
  useEffect(() => {
    onPreviewChange?.(loadState === 'ready' ? { profile: values } : null);
  }, [values, loadState, onPreviewChange]);

  useEffect(() => {
    onDirtyChange(isDirty);
  }, [isDirty, onDirtyChange]);
  useEffect(() => {
    onBusyChange?.(isSubmitting);
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
    api('/profile', { signal: controller.signal })
      .then((result) => {
        if (controller.signal.aborted) return;
        reset(result.profile);
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

  const submit = async (values) => {
    setSaved(false);
    clearErrors();
    const result = validateProfile(values);
    if (Object.keys(result.fields).length) {
      for (const [field, message] of Object.entries(result.fields))
        setError(field, { message }, { shouldFocus: true });
      return;
    }
    try {
      const response = await api('/profile', {
        method: 'PUT',
        body: { profile: result.profile, version },
      });
      reset(response.profile);
      setVersion(response.version);
      updateName(response.profile.name);
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

  const reload = () => {
    setSaved(false);
    setConfirmReload(false);
    setAttempt((value) => value + 1);
  };
  if (loadState === 'loading')
    return (
      <p role="status" className="mt-8 text-sm text-muted">
        Loading your saved profile…
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
      aria-labelledby="profile-title"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 id="profile-title" className="font-display text-2xl font-semibold tracking-tight">
            Your profile
          </h2>
          <p className="mt-2 text-xs leading-6 text-quiet">
            The introduction behind your work. These details will appear on your public portfolio.
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
        <fieldset disabled={isSubmitting} className="space-y-6">
          <div>
            <label htmlFor="profile-name" className="text-xs font-semibold text-label">
              Display name
            </label>
            <input
              id="profile-name"
              autoComplete="name"
              maxLength={100}
              className={inputStyle}
              aria-invalid={Boolean(errors.name)}
              aria-describedby={errors.name ? 'profile-name-error' : undefined}
              {...register('name', {
                validate: (value) => Boolean(value.trim()) || 'Enter your display name.',
              })}
            />
            {errors.name && (
              <p id="profile-name-error" role="alert" className="mt-2 text-xs text-danger">
                {errors.name.message}
              </p>
            )}
          </div>
          <div>
            <label htmlFor="profile-bio" className="text-xs font-semibold text-label">
              Bio
            </label>
            <textarea
              id="profile-bio"
              rows={5}
              maxLength={2000}
              placeholder="What do you build, and what makes you curious?"
              className={`${inputStyle} resize-y`}
              aria-invalid={Boolean(errors.bio)}
              aria-describedby="profile-bio-hint"
              {...register('bio')}
            />
            <p id="profile-bio-hint" className="mt-2 text-[11px] text-quiet">
              Optional. Up to 2,000 characters.
            </p>
            {errors.bio && (
              <p role="alert" className="mt-2 text-xs text-danger">
                {errors.bio.message}
              </p>
            )}
          </div>
          <div>
            <label htmlFor="profile-resume" className="text-xs font-semibold text-label">
              Resume URL
            </label>
            <input
              id="profile-resume"
              type="url"
              maxLength={2048}
              placeholder="https://example.com/resume.pdf"
              className={inputStyle}
              aria-invalid={Boolean(errors.resumeUrl)}
              aria-describedby="profile-resume-hint"
              {...register('resumeUrl')}
            />
            <p id="profile-resume-hint" className="mt-2 text-[11px] text-quiet">
              Optional. Paste a publicly accessible HTTP or HTTPS link to your resume.
            </p>
            {errors.resumeUrl && (
              <p role="alert" className="mt-2 text-xs text-danger">
                {errors.resumeUrl.message}
              </p>
            )}
          </div>
          <div>
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold">Social links</h3>
              <span className="text-[11px] text-quiet">{fields.length} / 10</span>
            </div>
            <p className="mt-2 text-xs leading-6 text-quiet">
              Add GitHub, LinkedIn, a blog, or another public profile.
            </p>
            {fields.length === 0 && (
              <p className="mt-4 rounded-lg border border-dashed border-line p-4 text-xs text-quiet">
                No social links yet. Add one when you’re ready.
              </p>
            )}
            <div className="mt-4 space-y-4">
              {fields.map((field, index) => (
                <div key={field.id} className="rounded-lg border border-line bg-canvas p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-muted">Link {index + 1}</span>
                    <button
                      type="button"
                      aria-label={`Remove social link ${index + 1}`}
                      className="cursor-pointer text-xs text-danger underline underline-offset-4"
                      onClick={() => {
                        remove(index);
                        setSaved(false);
                      }}
                    >
                      Remove
                    </button>
                  </div>
                  <div className="mt-3 grid gap-4 @md/editor:grid-cols-[1fr_2fr]">
                    <div>
                      <label
                        htmlFor={`social-${field.id}-label`}
                        className="text-xs font-semibold text-label"
                      >
                        Label
                      </label>
                      <input
                        id={`social-${field.id}-label`}
                        maxLength={40}
                        placeholder="GitHub"
                        className={inputStyle}
                        aria-invalid={Boolean(errors.socialLinks?.[index]?.label)}
                        {...register(`socialLinks.${index}.label`)}
                      />
                      {errors.socialLinks?.[index]?.label && (
                        <p role="alert" className="mt-2 text-xs text-danger">
                          {errors.socialLinks[index].label.message}
                        </p>
                      )}
                    </div>
                    <div>
                      <label
                        htmlFor={`social-${field.id}-url`}
                        className="text-xs font-semibold text-label"
                      >
                        URL
                      </label>
                      <input
                        id={`social-${field.id}-url`}
                        type="url"
                        maxLength={2048}
                        placeholder="https://github.com/yourname"
                        className={inputStyle}
                        aria-invalid={Boolean(errors.socialLinks?.[index]?.url)}
                        {...register(`socialLinks.${index}.url`)}
                      />
                      {errors.socialLinks?.[index]?.url && (
                        <p role="alert" className="mt-2 text-xs text-danger">
                          {errors.socialLinks[index].url.message}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {errors.socialLinks?.message && (
              <p role="alert" className="mt-2 text-xs text-danger">
                {errors.socialLinks.message}
              </p>
            )}
            <button
              type="button"
              disabled={fields.length >= 10}
              className={`${buttonStyle} mt-4`}
              onClick={() => {
                append({ label: '', url: '' });
                setSaved(false);
              }}
            >
              + Add social link
            </button>
          </div>
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
            <p>Discard unsaved changes and load the saved profile?</p>
            <div className="mt-3 flex gap-3">
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
            {isSubmitting ? 'Saving…' : 'Save profile'}
          </button>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => (isDirty ? setConfirmReload(true) : reload())}
            className={buttonStyle}
          >
            Reload saved data
          </button>
          {saved && (
            <p role="status" className="text-xs font-medium text-success">
              Profile saved.
            </p>
          )}
        </div>
      </form>
    </section>
  );
}
