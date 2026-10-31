import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Brand from '../components/Brand.jsx';
import ThemeToggle from '../components/ThemeToggle.jsx';
import { api } from '../lib/api.js';

const inputStyle =
  'mt-2 w-full rounded-lg border border-line bg-field px-3.5 py-3 text-sm text-ink placeholder:text-quiet focus:border-focus focus:outline-2 focus:outline-offset-2 focus:outline-focus-soft disabled:opacity-60';

function RecoveryField({ label, name, type = 'text', register, rules, errors, ...props }) {
  const error = errors[name];
  return (
    <div>
      <label htmlFor={name} className="block text-xs font-semibold text-label">
        {label}
      </label>
      <input
        id={name}
        type={type}
        {...register(name, rules)}
        {...props}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${name}-error` : undefined}
        className={inputStyle}
      />
      {error && (
        <p id={`${name}-error`} role="alert" className="mt-1.5 text-xs text-danger">
          {error.message}
        </p>
      )}
    </div>
  );
}

export default function PasswordRecoveryPage({ mode }) {
  const resetMode = mode === 'reset';
  const location = useLocation();
  const navigate = useNavigate();
  const [token] = useState(
    () => new URLSearchParams(window.location.hash.slice(1)).get('token') || '',
  );
  const [requested, setRequested] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [rootError, setRootError] = useState('');
  const {
    register,
    handleSubmit,
    getValues,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: { email: location.state?.email || '', password: '', confirmPassword: '' },
  });

  useEffect(() => {
    if (token) navigate('/reset-password', { replace: true });
  }, [navigate, token]);

  const submit = async (values) => {
    setRootError('');
    try {
      if (resetMode) {
        await api('/auth/password-reset/confirm', { body: { token, password: values.password } });
        setCompleted(true);
      } else {
        await api('/auth/password-reset/request', { body: { email: values.email } });
        setRequested(true);
      }
    } catch (failure) {
      for (const [field, message] of Object.entries(failure.fields || {})) {
        if (['email', 'password'].includes(field)) setError(field, { message });
      }
      setRootError(failure.message || 'Could not complete the request. Please try again.');
    }
  };

  const title = resetMode ? 'Choose a new password' : 'Reset your password';
  const finished = resetMode ? completed : requested;
  const canSubmit = !resetMode || Boolean(token);

  return (
    <div className="mx-auto max-w-[1200px] px-6 sm:px-12">
      <header className="flex h-24 items-center justify-between border-b border-line-soft">
        <Brand />
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link to="/login" className="text-xs text-muted underline-offset-4 hover:underline">
            Back to sign in ↗
          </Link>
        </div>
      </header>
      <main
        id="main-content"
        tabIndex={-1}
        className="grid gap-12 py-12 focus:outline-none md:min-h-[calc(100vh-96px)] md:grid-cols-2 md:items-center md:gap-20 md:py-16"
      >
        <section className="max-w-md">
          <span className="text-[10px] font-bold tracking-[2px] text-muted">ACCOUNT SECURITY</span>
          <h1 className="mt-5 font-display text-4xl leading-tight font-semibold tracking-[-2px] sm:text-5xl">
            {resetMode ? (
              <>
                A fresh start,
                <br />
                <span className="text-accent">one secure step.</span>
              </>
            ) : (
              <>
                Your work is safe.
                <br />
                <span className="text-accent">Let’s get you back.</span>
              </>
            )}
          </h1>
          <p className="mt-5 max-w-sm text-sm leading-7 text-muted">
            {resetMode
              ? 'Set a new password for your CodeFolio workspace. Reset links are private, expire after 30 minutes, and work once.'
              : 'Enter the email address on your account. If it matches, we’ll send a private link to choose a new password.'}
          </p>
          <div className="mt-8 rounded-xl border border-line bg-soft p-5 text-xs leading-6 text-success">
            Your portfolio and saved work stay in your account. Changing your password signs out
            other sessions.
          </div>
        </section>
        <section
          className="w-full max-w-md rounded-2xl border border-line bg-panel p-6 shadow-[0_12px_35px_var(--color-shadow)] sm:p-8"
          aria-labelledby="form-title"
        >
          <h2 id="form-title" className="font-display text-2xl font-semibold tracking-tight">
            {finished ? (resetMode ? 'Password updated' : 'Check your inbox') : title}
          </h2>
          {finished ? (
            <div className="mt-5 space-y-5">
              <p role="status" className="rounded-lg bg-soft p-4 text-sm leading-6 text-success">
                {resetMode
                  ? 'Your password has been updated. Sign in with your new password.'
                  : 'If an account matches that address, a password reset link will be sent. Check your inbox and spam folder.'}
              </p>
              <Link
                to="/login"
                className="block w-full rounded-lg bg-action px-5 py-3.5 text-center text-sm font-semibold text-action-ink hover:bg-action-hover focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus"
              >
                Back to sign in ↗
              </Link>
            </div>
          ) : resetMode && !token ? (
            <div className="mt-5 space-y-5">
              <p role="alert" className="rounded-lg bg-soft p-4 text-sm leading-6 text-muted">
                This reset link is missing or has expired. Request a new one to continue.
              </p>
              <Link
                className="font-semibold text-success underline underline-offset-4"
                to="/forgot-password"
              >
                Request another reset link
              </Link>
            </div>
          ) : (
            <>
              <p className="mt-2 text-xs leading-6 text-quiet">
                {resetMode
                  ? 'Choose a unique password with 12–128 characters.'
                  : 'We’ll never reveal whether an address has an account.'}
              </p>
              <form
                className="mt-6 space-y-4"
                noValidate
                onSubmit={handleSubmit(submit)}
                aria-busy={isSubmitting}
              >
                <fieldset disabled={isSubmitting} className="space-y-4">
                  {resetMode ? (
                    <>
                      <RecoveryField
                        label="New password"
                        name="password"
                        type="password"
                        autoComplete="new-password"
                        maxLength={128}
                        register={register}
                        errors={errors}
                        rules={{
                          required: 'Enter a new password.',
                          minLength: { value: 12, message: 'Use at least 12 characters.' },
                          maxLength: { value: 128, message: 'Use at most 128 characters.' },
                        }}
                      />
                      <p className="text-[11px] leading-5 text-quiet">
                        A long, unique passphrase works well.
                      </p>
                      <RecoveryField
                        label="Confirm new password"
                        name="confirmPassword"
                        type="password"
                        autoComplete="new-password"
                        maxLength={128}
                        register={register}
                        errors={errors}
                        rules={{
                          validate: (value) =>
                            value === getValues('password') || 'Passwords do not match.',
                        }}
                      />
                    </>
                  ) : (
                    <RecoveryField
                      label="Email address"
                      name="email"
                      type="email"
                      autoComplete="email"
                      autoCapitalize="none"
                      spellCheck={false}
                      maxLength={254}
                      placeholder="you@example.com"
                      register={register}
                      errors={errors}
                      rules={{
                        validate: (value) =>
                          /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()) ||
                          'Enter a valid email address.',
                      }}
                    />
                  )}
                </fieldset>
                {rootError && (
                  <p
                    role="alert"
                    className="rounded-lg border border-danger-line bg-danger-bg p-3 text-sm text-danger"
                  >
                    {rootError}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={isSubmitting || !canSubmit}
                  className="mt-2 w-full cursor-pointer rounded-lg bg-action px-5 py-3.5 text-sm font-semibold text-action-ink hover:bg-action-hover focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus disabled:cursor-wait disabled:opacity-60"
                >
                  {isSubmitting
                    ? 'Please wait…'
                    : resetMode
                      ? 'Update password ↗'
                      : 'Send reset link ↗'}
                </button>
              </form>
            </>
          )}
          <p className="mt-6 text-center text-xs text-quiet">
            Remember your password?{' '}
            <Link className="font-semibold text-success underline underline-offset-4" to="/login">
              Sign in
            </Link>
          </p>
        </section>
      </main>
    </div>
  );
}
