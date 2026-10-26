import { useForm } from 'react-hook-form';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import Brand from '../components/Brand.jsx';
import ThemeToggle from '../components/ThemeToggle.jsx';
import { useAuth } from './AuthContext.jsx';
import { api } from '../lib/api.js';
import { RESERVED_USERNAMES } from '../../shared/portfolio.js';

const inputStyle =
  'mt-2 w-full rounded-lg border border-line bg-field px-3.5 py-3 text-sm text-ink placeholder:text-quiet focus:border-focus focus:outline-2 focus:outline-offset-2 focus:outline-focus-soft disabled:opacity-60';

function Field({ label, name, type = 'text', register, rules, errors, ...props }) {
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
        aria-describedby={error ? `${name}-error` : props['aria-describedby']}
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

export default function AuthPage({ mode }) {
  const registration = mode === 'register';
  const { user, loading, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const {
    register,
    handleSubmit,
    getValues,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      name: '',
      username: '',
      email: location.state?.email || '',
      password: '',
      confirmPassword: '',
    },
  });

  const submit = async (values) => {
    try {
      if (registration) {
        await api('/auth/register', {
          body: {
            name: values.name,
            username: values.username,
            email: values.email,
            password: values.password,
          },
        });
        reset();
        navigate('/login', {
          replace: true,
          state: { registered: true, email: values.email.trim() },
        });
      } else {
        await login({ email: values.email, password: values.password });
        reset();
        navigate('/dashboard', { replace: true });
      }
    } catch (failure) {
      for (const [field, message] of Object.entries(failure.fields || {})) {
        if (['name', 'username', 'email', 'password'].includes(field)) setError(field, { message });
      }
      setError('root', { message: failure.message });
    }
  };

  if (!loading && user) return <Navigate to="/dashboard" replace />;
  return (
    <div className="mx-auto max-w-[1200px] px-6 sm:px-12">
      <header className="flex h-24 items-center justify-between border-b border-line-soft">
        <Brand />
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link to="/" className="text-xs text-muted underline-offset-4 hover:underline">
            Back to home ↗
          </Link>
        </div>
      </header>
      <main
        id="main-content"
        tabIndex={-1}
        className="grid gap-12 py-12 focus:outline-none md:min-h-[calc(100vh-96px)] md:grid-cols-2 md:items-center md:gap-20 md:py-16"
      >
        <section className="max-w-md">
          <span className="text-[10px] font-bold tracking-[2px] text-muted">
            YOUR NEXT CHAPTER STARTS HERE
          </span>
          <h1 className="mt-5 font-display text-4xl leading-tight font-semibold tracking-[-2px] sm:text-5xl">
            {registration ? (
              <>
                Make room for
                <br />
                <span className="text-accent">your best work.</span>
              </>
            ) : (
              <>
                Welcome back.
                <br />
                <span className="text-accent">Keep building.</span>
              </>
            )}
          </h1>
          <p className="mt-5 max-w-sm text-sm leading-7 text-muted">
            {registration
              ? 'Create your account and give your projects, skills, and ideas a place of their own.'
              : 'Sign in to your workspace. Your account is the first step toward a portfolio that feels like you.'}
          </p>
          <div className="mt-8 rounded-xl border border-line bg-soft p-5 text-xs leading-6 text-success">
            {registration
              ? 'Start with a Free account. Choose a unique username that will become your portfolio address.'
              : 'Your workspace is private. Your public portfolio will have its own shareable address.'}
          </div>
        </section>
        <section
          className="w-full max-w-md rounded-2xl border border-line bg-panel p-6 shadow-[0_12px_35px_var(--color-shadow)] sm:p-8"
          aria-labelledby="form-title"
        >
          <h2 id="form-title" className="font-display text-2xl font-semibold tracking-tight">
            {registration ? 'Create your account' : 'Sign in to CodeFolio'}
          </h2>
          <p className="mt-2 text-xs leading-6 text-quiet">
            {registration
              ? 'A few details, and you’re on your way.'
              : 'Enter your email and password to continue.'}
          </p>
          {!registration && location.state?.registered && (
            <p role="status" className="mt-5 rounded-lg bg-soft p-3 text-sm text-success">
              Account created. Sign in with your new password.
            </p>
          )}
          {!registration && location.state?.protectedVisit && (
            <p className="mt-4 text-xs text-muted">Please sign in to open your dashboard.</p>
          )}
          <form
            className="mt-6 space-y-4"
            noValidate
            onSubmit={handleSubmit(submit)}
            aria-busy={isSubmitting}
          >
            <fieldset disabled={isSubmitting} className="space-y-4">
              {registration && (
                <>
                  <Field
                    label="Your name"
                    name="name"
                    autoComplete="name"
                    maxLength={100}
                    placeholder="Alex Morgan"
                    register={register}
                    errors={errors}
                    rules={{
                      validate: (value) => Boolean(value.trim()) || 'Enter your name.',
                      maxLength: { value: 100, message: 'Use at most 100 characters.' },
                    }}
                  />
                  <Field
                    label="Username"
                    name="username"
                    autoComplete="username"
                    autoCapitalize="none"
                    spellCheck={false}
                    maxLength={30}
                    placeholder="alex-dev"
                    register={register}
                    errors={errors}
                    rules={{
                      validate: (value) => {
                        const normalized = value.trim().toLowerCase();
                        return (
                          (/^[a-z0-9](?:[a-z0-9_-]{1,28}[a-z0-9])$/.test(normalized) &&
                            !RESERVED_USERNAMES.includes(normalized)) ||
                          'Use 3–30 letters or numbers with internal hyphens/underscores. Avoid reserved names.'
                        );
                      },
                    }}
                  />
                </>
              )}
              <Field
                label="Email address"
                name="email"
                type="email"
                autoComplete={registration ? 'email' : 'username'}
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
              <Field
                label="Password"
                name="password"
                type="password"
                autoComplete={registration ? 'new-password' : 'current-password'}
                maxLength={128}
                register={register}
                errors={errors}
                aria-describedby="password-hint"
                rules={{
                  required: 'Enter your password.',
                  minLength: { value: 12, message: 'Use at least 12 characters.' },
                  maxLength: { value: 128, message: 'Use at most 128 characters.' },
                }}
              />
              <p id="password-hint" className="text-[11px] leading-5 text-quiet">
                {registration
                  ? 'Use 12–128 characters. A long, unique passphrase works well.'
                  : 'Use the password you chose when creating your account.'}
              </p>
              {registration && (
                <Field
                  label="Confirm password"
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
              )}
            </fieldset>
            {errors.root && (
              <p
                role="alert"
                className="rounded-lg border border-danger-line bg-danger-bg p-3 text-sm text-danger"
              >
                {errors.root.message}
              </p>
            )}
            <button
              type="submit"
              disabled={isSubmitting || loading}
              className="mt-2 w-full cursor-pointer rounded-lg bg-action px-5 py-3.5 text-sm font-semibold text-action-ink hover:bg-action-hover focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus disabled:cursor-wait disabled:opacity-60"
            >
              {isSubmitting
                ? registration
                  ? 'Creating account…'
                  : 'Signing in…'
                : registration
                  ? 'Create account ↗'
                  : 'Sign in ↗'}
            </button>
          </form>
          <p className="mt-6 text-center text-xs text-quiet">
            {registration ? 'Already have an account? ' : 'New to CodeFolio? '}
            <Link
              className="font-semibold text-success underline underline-offset-4"
              to={registration ? '/login' : '/register'}
            >
              {registration ? 'Sign in' : 'Create an account'}
            </Link>
          </p>
        </section>
      </main>
    </div>
  );
}
