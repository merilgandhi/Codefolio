import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useAuth } from '../auth/AuthContext.jsx';
import { api } from '../lib/api.js';
import { normalizeDomain } from '../../shared/domains.js';
import ProBadge from '../components/ProBadge.jsx';

const buttonStyle =
  'min-h-11 cursor-pointer rounded-lg border border-line px-4 py-2.5 text-xs font-medium hover:bg-soft focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus disabled:cursor-not-allowed disabled:opacity-50';

export default function DomainSettings({ onDirtyChange, onBusyChange }) {
  const { user, sessionExpired } = useAuth();
  const [state, setState] = useState('loading');
  const [attempt, setAttempt] = useState(0);
  const [saved, setSaved] = useState(null);
  const [message, setMessage] = useState('');
  const [loadError, setLoadError] = useState('');
  const [conflict, setConflict] = useState(false);
  const [confirmReload, setConfirmReload] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [removing, setRemoving] = useState(false);
  const {
    register,
    reset,
    handleSubmit,
    setError,
    setFocus,
    clearErrors,
    formState: { errors, isDirty, isSubmitting },
  } = useForm({ defaultValues: { domain: '' } });
  const busy = isSubmitting || removing;
  const restricted = user.tier !== 'pro' || state === 'restricted';
  useEffect(() => {
    if (errors.domain && !busy) setFocus('domain');
  }, [errors.domain, busy, setFocus]);
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
    if (user.tier !== 'pro') return;
    const controller = new AbortController();
    setState('loading');
    api('/pro/domain', { signal: controller.signal })
      .then((result) => {
        if (controller.signal.aborted) return;
        setSaved(result);
        reset({ domain: result.domain || '' });
        setConflict(false);
        setState('ready');
      })
      .catch((failure) => {
        if (controller.signal.aborted) return;
        if (failure.status === 401) sessionExpired();
        else if (failure.status === 403) setState('restricted');
        else {
          setLoadError(failure.message);
          setState('error');
        }
      });
    return () => controller.abort();
  }, [attempt, user.tier, reset, sessionExpired]);
  const reload = () => {
    setConfirmReload(false);
    setConfirmRemove(false);
    setMessage('');
    setAttempt((value) => value + 1);
  };
  const fail = (failure) => {
    if (failure.status === 401) return sessionExpired();
    if (failure.status === 403) setState('restricted');
    if (failure.status === 409 && !failure.fields.domain) setConflict(true);
    for (const [field, text] of Object.entries(failure.fields))
      setError(field, { message: text }, { shouldFocus: true });
    setError('root', { message: failure.message });
  };
  const submit = async ({ domain }) => {
    clearErrors();
    setMessage('');
    const normalized = normalizeDomain(domain);
    if (!normalized)
      return setError(
        'domain',
        {
          message:
            'Enter a domain such as yourname.com, without https://, a path or a port. Use ASCII or punycode.',
        },
        { shouldFocus: true },
      );
    try {
      const result = await api('/pro/domain', {
        method: 'PUT',
        body: { domain: normalized, version: saved.version },
      });
      setSaved(result);
      reset({ domain: result.domain });
      setConflict(false);
      setMessage('Domain saved. Your test redirect is ready.');
    } catch (failure) {
      fail(failure);
    }
  };
  const remove = async () => {
    setRemoving(true);
    clearErrors();
    setMessage('');
    try {
      const result = await api('/pro/domain', {
        method: 'DELETE',
        body: { version: saved.version },
      });
      setSaved(result);
      reset({ domain: '' });
      setConflict(false);
      setConfirmRemove(false);
      setMessage('Domain removed. The previous test link is now inactive.');
    } catch (failure) {
      fail(failure);
    } finally {
      setRemoving(false);
    }
  };
  return (
    <section
      aria-labelledby="domain-title"
      className="mt-8 rounded-xl border border-line bg-panel p-5 sm:p-8"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h2 id="domain-title" className="font-display text-xl font-semibold tracking-tight">
              Custom domain
            </h2>
            <ProBadge label="Pro feature" />
          </div>
          <p className="mt-2 max-w-lg text-sm leading-7 text-muted">
            A personal address for your developer identity.
          </p>
        </div>
        <span className="rounded-full border border-line bg-soft px-3 py-1 text-[11px] text-muted">
          Redirect simulation
        </span>
      </div>
      <p className="mt-6 rounded-lg border border-line-soft bg-canvas p-4 text-xs leading-6 text-quiet">
        This project simulates domain mapping. The test link opens your portfolio inside CodeFolio.
        Publishing at your own domain requires DNS and hosting configuration outside this
        simulation.
      </p>
      {restricted ? (
        <div className="mt-6 rounded-lg border border-line p-5">
          <h3 className="font-semibold">Available with Pro</h3>
          <p className="mt-2 text-sm leading-7 text-muted">
            Custom domain settings require a Pro account. Use Upgrade to Pro in the header, choose
            Pro and save to activate this feature. Demo mode requires no payment.
          </p>
        </div>
      ) : state === 'loading' ? (
        <p role="status" className="mt-6 text-sm text-muted">
          Loading domain settings…
        </p>
      ) : state === 'error' ? (
        <div className="mt-6">
          <p role="alert" className="text-sm text-danger">
            {loadError}
          </p>
          <button onClick={reload} className={`${buttonStyle} mt-4`}>
            Try loading again
          </button>
        </div>
      ) : (
        <>
          <form
            noValidate
            onSubmit={handleSubmit(submit)}
            onChange={() => setMessage('')}
            aria-busy={busy}
            className="mt-7 space-y-5"
          >
            <fieldset disabled={busy} className="min-w-0">
              <label htmlFor="custom-domain" className="text-sm font-medium">
                Domain name
              </label>
              <input
                id="custom-domain"
                type="text"
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
                maxLength={253}
                placeholder="yourname.com"
                aria-invalid={Boolean(errors.domain)}
                aria-describedby={`domain-hint${errors.domain ? ' domain-error' : ''}`}
                {...register('domain')}
                className="mt-3 min-h-12 w-full rounded-lg border border-line bg-field px-4 py-3 text-sm text-ink placeholder:text-quiet focus:border-focus focus:outline-2 focus:outline-offset-2 focus:outline-focus-soft disabled:opacity-60"
              />
              <p id="domain-hint" className="mt-2 text-xs leading-6 text-quiet">
                Use a domain or subdomain, such as yourname.com or work.yourname.com. Save one
                domain per account.
              </p>
              {errors.domain && (
                <p id="domain-error" role="alert" className="mt-2 text-xs text-danger">
                  {errors.domain.message}
                </p>
              )}
            </fieldset>
            {errors.root && (
              <p role="alert" className="rounded-lg bg-danger-bg p-4 text-sm text-danger">
                {errors.root.message}
              </p>
            )}
            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={busy || !isDirty || conflict}
                className="min-h-11 cursor-pointer rounded-lg bg-action px-5 py-2.5 text-xs font-semibold text-action-ink hover:bg-action-hover focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting ? 'Saving…' : 'Save domain'}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => (isDirty ? setConfirmReload(true) : reload())}
                className={buttonStyle}
              >
                Reload saved settings
              </button>
            </div>
          </form>
          {confirmReload && (
            <div className="mt-5 rounded-lg border border-line bg-soft p-4 text-sm">
              <p>Discard your edits and reload the saved domain?</p>
              <div className="mt-3 flex flex-wrap gap-3">
                <button disabled={busy} onClick={reload} className={buttonStyle}>
                  Discard and reload
                </button>
                <button
                  disabled={busy}
                  onClick={() => setConfirmReload(false)}
                  className={buttonStyle}
                >
                  Keep editing
                </button>
              </div>
            </div>
          )}
          <p role="status" className="mt-4 text-sm text-success">
            {message || (isDirty ? 'Unsaved changes' : '')}
          </p>
          {saved.domain && (
            <div className="mt-7 rounded-xl border border-line-soft bg-canvas p-5">
              <span className="text-[10px] font-bold tracking-[2px] text-muted">
                SAVED CONNECTION
              </span>
              <p className="mt-3 break-all font-display text-lg font-semibold">{saved.domain}</p>
              <p className="mt-2 break-all text-xs leading-6 text-quiet">
                Redirects to /{user.username}. The test always uses your saved domain.
              </p>
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <a
                  href={saved.redirectPath}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${buttonStyle} inline-flex items-center`}
                >
                  Test saved redirect<span className="sr-only"> (opens in a new tab)</span>
                  <span aria-hidden="true" className="ml-2">
                    ↗
                  </span>
                </a>
                <button
                  disabled={busy || conflict}
                  onClick={() => setConfirmRemove(true)}
                  className={`${buttonStyle} text-danger`}
                >
                  Remove domain
                </button>
              </div>
              {confirmRemove && (
                <div className="mt-5 border-t border-line pt-4 text-sm">
                  <p>
                    Remove this saved domain{isDirty ? ' and discard your edits' : ''}? Its test
                    link will stop working.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-3">
                    <button
                      disabled={busy}
                      onClick={remove}
                      className={`${buttonStyle} text-danger`}
                    >
                      {removing ? 'Removing…' : 'Confirm removal'}
                    </button>
                    <button
                      disabled={busy}
                      onClick={() => setConfirmRemove(false)}
                      className={buttonStyle}
                    >
                      Keep domain
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
}
