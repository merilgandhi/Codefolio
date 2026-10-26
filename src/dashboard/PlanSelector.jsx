import { useEffect, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { useAuth } from '../auth/AuthContext.jsx';
import { api } from '../lib/api.js';

const plans = [
  {
    id: 'free',
    name: 'Free',
    description: 'Everything you need to share your work.',
    features: [
      'Profile, projects and categorized skills',
      'Both portfolio layouts and live preview',
      'Public portfolio and contact form',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    description: 'Give your developer identity a little extra.',
    features: [
      'Everything included in Free',
      'Pro badge on your public portfolio',
      'Custom-domain redirect simulation',
    ],
  },
];
const buttonStyle =
  'min-h-11 cursor-pointer rounded-lg border border-line px-4 py-2.5 text-xs font-medium hover:bg-soft focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus disabled:cursor-not-allowed disabled:opacity-50';

export default function PlanSelector({ onDirtyChange, onBusyChange }) {
  const { updateTier, sessionExpired } = useAuth();
  const [state, setState] = useState('loading');
  const [attempt, setAttempt] = useState(0);
  const [saved, setSaved] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [conflict, setConflict] = useState(false);
  const [confirmReload, setConfirmReload] = useState(false);
  const {
    register,
    control,
    reset,
    handleSubmit,
    formState: { isDirty, isSubmitting },
  } = useForm({ defaultValues: { planId: 'free' } });
  const selected = useWatch({ control, name: 'planId' });
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
    setState('loading');
    setError('');
    setMessage('');
    api('/plan', { signal: controller.signal })
      .then((result) => {
        if (controller.signal.aborted) return;
        setSaved(result);
        reset({ planId: result.plan.id });
        updateTier(result.plan.id);
        setConflict(false);
        setState('ready');
      })
      .catch((failure) => {
        if (controller.signal.aborted) return;
        if (failure.status === 401) sessionExpired();
        else {
          setError(failure.message);
          setState('error');
        }
      });
    return () => controller.abort();
  }, [attempt, reset, updateTier, sessionExpired]);
  const reload = () => {
    setConfirmReload(false);
    setAttempt((value) => value + 1);
  };
  const submit = async ({ planId }) => {
    setError('');
    setMessage('');
    try {
      const result = await api('/plan', {
        method: 'PUT',
        body: { planId, version: saved.version },
      });
      setSaved(result);
      reset({ planId: result.plan.id });
      updateTier(result.plan.id);
      setConflict(false);
      setMessage(
        `${result.plan.label} plan activated. ${result.plan.id === 'pro' ? 'Your Pro badge and custom-domain simulation are now available.' : 'Your portfolio is kept; Pro features are now paused.'} No payment was made.`,
      );
    } catch (failure) {
      if (failure.status === 401) return sessionExpired();
      if (failure.status === 409) setConflict(true);
      setError(failure.message);
    }
  };
  return (
    <section
      aria-labelledby="plans-title"
      className="mt-8 rounded-xl border border-line bg-panel p-5 sm:p-8"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 id="plans-title" className="font-display text-xl font-semibold tracking-tight">
            Choose your plan
          </h2>
          <p className="mt-2 text-sm leading-7 text-muted">
            Start with Free or explore the Pro experience.
          </p>
        </div>
        <span className="rounded-full border border-line-accent bg-soft px-3 py-1.5 text-[11px] font-medium text-accent">
          Demo mode
        </span>
      </div>
      <p className="mt-5 text-xs leading-6 text-quiet">
        No payment required. Both plans are available for this project demonstration. Your choice is
        saved to your account.
      </p>
      {state === 'loading' ? (
        <p role="status" className="mt-6 text-sm text-muted">
          Loading your saved plan…
        </p>
      ) : state === 'error' ? (
        <div className="mt-6">
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
          <button onClick={reload} className={`${buttonStyle} mt-4`}>
            Try loading again
          </button>
        </div>
      ) : (
        <form
          onSubmit={handleSubmit(submit)}
          aria-busy={isSubmitting}
          className="mt-7"
          onChange={() => setMessage('')}
        >
          <fieldset disabled={isSubmitting} className="min-w-0">
            <legend className="sr-only">Select a demo plan</legend>
            <div className="grid min-w-0 gap-4 sm:grid-cols-2">
              {plans.map((plan) => (
                <label
                  key={plan.id}
                  className={`relative flex min-w-0 cursor-pointer flex-col rounded-xl border p-5 transition-colors focus-within:outline-2 focus-within:outline-offset-4 focus-within:outline-focus sm:p-6 ${selected === plan.id ? 'border-focus bg-soft' : 'border-line bg-canvas hover:border-line-accent'}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-display text-2xl font-semibold">{plan.name}</span>
                    <input
                      type="radio"
                      value={plan.id}
                      aria-label={plan.name}
                      {...register('planId')}
                      className="size-4 shrink-0 accent-action"
                    />
                  </div>
                  <p className="mt-3 text-xs leading-6 text-muted">{plan.description}</p>
                  <ul className="mt-5 flex-1 space-y-3 text-xs leading-6">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex gap-2">
                        <span aria-hidden="true" className="text-accent">
                          ✓
                        </span>
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <span className="mt-6 text-[11px] font-medium text-accent">
                    {saved.plan.id === plan.id
                      ? 'Current plan'
                      : selected === plan.id
                        ? 'Selected — save to activate'
                        : 'Available in demo mode'}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          {saved.plan.id === 'pro' && selected === 'free' && (
            <p className="mt-5 rounded-lg border border-line bg-soft p-4 text-xs leading-6 text-muted">
              Switching to Free hides your Pro badge and pauses your domain redirect. Your portfolio
              and saved domain setting are kept. Selecting Pro again restores access.
            </p>
          )}
          {error && (
            <p role="alert" className="mt-5 rounded-lg bg-danger-bg p-4 text-sm text-danger">
              {error}
            </p>
          )}
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={isSubmitting || !isDirty || conflict}
              className="min-h-11 cursor-pointer rounded-lg bg-action px-5 py-2.5 text-xs font-semibold text-action-ink hover:bg-action-hover focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? 'Saving…' : 'Save plan'}
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => (isDirty ? setConfirmReload(true) : reload())}
              className={buttonStyle}
            >
              Reload saved plan
            </button>
          </div>
          {confirmReload && (
            <div className="mt-5 rounded-lg border border-line bg-soft p-4 text-sm">
              <p>Discard your selection and reload the saved plan?</p>
              <div className="mt-3 flex flex-wrap gap-3">
                <button type="button" onClick={reload} className={buttonStyle}>
                  Discard and reload
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmReload(false)}
                  className={buttonStyle}
                >
                  Keep editing
                </button>
              </div>
            </div>
          )}
          <p role="status" className="mt-4 text-sm leading-7 text-success">
            {message || (isDirty ? 'Unsaved plan selection' : '')}
          </p>
        </form>
      )}
    </section>
  );
}
