import { useEffect, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { DEFAULT_TEMPLATE_ID, TEMPLATE_OPTIONS } from '../../shared/portfolio.js';
import { useAuth } from '../auth/AuthContext.jsx';
import { api } from '../lib/api.js';
import { getTemplate } from '../portfolio/templateRegistry.js';

const buttonStyle =
  'min-h-11 cursor-pointer rounded-lg border border-line px-4 py-2.5 text-xs font-medium hover:bg-soft focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus disabled:cursor-not-allowed disabled:opacity-50';

function LayoutSketch({ id }) {
  return (
    <div
      aria-hidden="true"
      className="mb-5 flex h-28 gap-2 rounded-lg border border-line-soft bg-canvas p-3"
    >
      {id === 'bento' ? (
        <div className="grid w-full grid-cols-3 gap-2">
          <div className="col-span-2 rounded bg-chip" />
          <div className="rounded bg-subtle" />
          <div className="col-span-3 grid grid-cols-2 gap-2">
            <div className="rounded border border-line bg-panel" />
            <div className="rounded border border-line bg-panel" />
          </div>
        </div>
      ) : (
        <>
          <div className="w-1/3 rounded bg-chip" />
          <div className="flex flex-1 flex-col gap-2">
            <div className="h-2 w-3/4 rounded bg-line" />
            <div className="flex-1 rounded border border-line bg-panel" />
            <div className="h-2 w-1/2 rounded bg-line" />
          </div>
        </>
      )}
    </div>
  );
}

export default function TemplateSelector({ onDirtyChange, onBusyChange, onPreviewChange }) {
  const { sessionExpired, updateTemplate } = useAuth();
  const [status, setStatus] = useState('loading');
  const [loadError, setLoadError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [version, setVersion] = useState(null);
  const [savedId, setSavedId] = useState(DEFAULT_TEMPLATE_ID);
  const [saved, setSaved] = useState(false);
  const [conflict, setConflict] = useState(false);
  const [confirmReload, setConfirmReload] = useState(false);
  const {
    register,
    control,
    reset,
    handleSubmit,
    setError,
    clearErrors,
    formState: { isDirty, isSubmitting, errors },
  } = useForm({ defaultValues: { templateId: DEFAULT_TEMPLATE_ID } });
  const selection = useWatch({ control, name: 'templateId' });
  useEffect(() => {
    onPreviewChange?.(status === 'ready' ? { templateId: selection } : null);
  }, [selection, status, onPreviewChange]);
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
    setStatus('loading');
    setLoadError('');
    api('/template', { signal: controller.signal })
      .then((result) => {
        if (controller.signal.aborted) return;
        setVersion(result.version);
        setSavedId(result.portfolio.templateId);
        reset({ templateId: result.portfolio.templateId });
        setConflict(false);
        updateTemplate(result.portfolio.templateId);
        setStatus('ready');
      })
      .catch((failure) => {
        if (controller.signal.aborted) return;
        if (failure.status === 401) sessionExpired();
        else {
          setLoadError(failure.message);
          setStatus('error');
        }
      });
    return () => controller.abort();
  }, [attempt, reset, sessionExpired, updateTemplate]);

  const submit = async (values) => {
    setSaved(false);
    setConfirmReload(false);
    clearErrors();
    try {
      const result = await api('/template', {
        method: 'PUT',
        body: { templateId: values.templateId, version },
      });
      setVersion(result.version);
      setSavedId(result.portfolio.templateId);
      reset({ templateId: result.portfolio.templateId });
      updateTemplate(result.portfolio.templateId);
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
    setConfirmReload(false);
    setSaved(false);
    setAttempt((value) => value + 1);
  };
  if (status === 'loading')
    return (
      <p role="status" className="mt-8 text-sm text-muted">
        Loading your saved template…
      </p>
    );
  if (status === 'error')
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
    <section className="mt-8" aria-labelledby="template-selector-title">
      <div className="rounded-2xl border border-line bg-panel p-5 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2
              id="template-selector-title"
              className="font-display text-xl font-semibold tracking-tight"
            >
              Choose your layout
            </h2>
            <p className="mt-2 max-w-xl text-xs leading-6 text-muted">
              Preview a layout, then save your choice.
            </p>
          </div>
          <span className="rounded-full bg-soft px-3 py-1.5 text-[11px] text-success">
            {isDirty ? 'Unsaved selection' : 'Up to date'}
          </span>
        </div>
        <form
          onSubmit={handleSubmit(submit)}
          noValidate
          aria-busy={isSubmitting}
          className="mt-6"
          onChange={() => {
            setSaved(false);
            clearErrors('templateId');
          }}
        >
          <fieldset disabled={isSubmitting} className="grid min-w-0 gap-4 @lg/editor:grid-cols-2">
            <legend className="sr-only">Portfolio layout</legend>
            {TEMPLATE_OPTIONS.map((option) => (
              <label
                key={option.id}
                className={`min-w-0 cursor-pointer rounded-xl border p-4 focus-within:outline-2 focus-within:outline-offset-4 focus-within:outline-focus ${selection === option.id ? 'border-focus bg-soft' : 'border-line bg-panel hover:bg-canvas'}`}
              >
                <LayoutSketch id={option.id} />
                <div className="flex items-start gap-3">
                  <input
                    type="radio"
                    value={option.id}
                    {...register('templateId', { required: 'Choose a portfolio layout.' })}
                    aria-label={option.name}
                    aria-describedby={`template-${option.id}-description`}
                    className="mt-1 size-4 shrink-0 accent-action"
                  />
                  <div className="min-w-0">
                    <span className="font-display text-sm font-semibold">{option.name}</span>
                    {savedId === option.id && (
                      <span className="ml-2 text-[10px] font-medium text-success">Saved</span>
                    )}
                    <p
                      id={`template-${option.id}-description`}
                      className="mt-2 text-xs leading-6 text-muted"
                    >
                      {option.description}
                    </p>
                  </div>
                </div>
              </label>
            ))}
          </fieldset>
          {errors.templateId && (
            <p role="alert" className="mt-4 text-xs text-danger">
              {errors.templateId.message}
            </p>
          )}
          {errors.root && (
            <p
              role="alert"
              className="mt-5 rounded-lg border border-danger-line bg-danger-bg p-3 text-sm text-danger"
            >
              {errors.root.message}
            </p>
          )}
          {confirmReload && (
            <div className="mt-5 rounded-lg border border-line bg-soft p-4 text-sm">
              <p>Discard your unsaved selection and reload saved content?</p>
              <div className="mt-3 flex flex-wrap gap-3">
                <button type="button" onClick={reload} className={buttonStyle}>
                  Discard and reload
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmReload(false)}
                  className={buttonStyle}
                >
                  Keep choosing
                </button>
              </div>
            </div>
          )}
          <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-line-soft pt-6">
            <button
              type="submit"
              disabled={!isDirty || isSubmitting || conflict}
              className="min-h-11 cursor-pointer rounded-lg bg-action px-5 py-3 text-sm font-semibold text-action-ink hover:bg-action-hover focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? 'Saving…' : 'Save template'}
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => (isDirty ? setConfirmReload(true) : reload())}
              className={buttonStyle}
            >
              Reload saved content
            </button>
            {saved && (
              <p role="status" className="text-xs font-medium text-success">
                Template saved: {getTemplate(savedId).name}.
              </p>
            )}
          </div>
        </form>
      </div>
    </section>
  );
}
