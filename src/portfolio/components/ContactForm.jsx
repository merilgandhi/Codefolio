import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { validateContact } from '../../../shared/contact.js';
import { api } from '../../lib/api.js';

const inputStyle =
  'mt-2 w-full rounded-lg border border-line bg-field px-3.5 py-3 text-sm text-ink placeholder:text-quiet focus:border-focus focus:outline-2 focus:outline-offset-2 focus:outline-focus disabled:opacity-60';
export default function ContactForm({ username, name, id }) {
  const [sent, setSent] = useState(false);
  const {
    register,
    handleSubmit,
    setError,
    reset,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: { name: '', email: '', subject: '', message: '', website: '' },
    resolver: (values) => {
      const result = validateContact(values);
      return {
        values: Object.keys(result.fields).length ? {} : values,
        errors: Object.fromEntries(
          Object.entries(result.fields).map(([key, message]) => [
            key,
            { type: 'validate', message },
          ]),
        ),
      };
    },
  });
  const submit = async (values) => {
    clearErrors();
    setSent(false);
    try {
      await api(`/contact/${encodeURIComponent(username)}`, { body: values, timeoutMs: 25000 });
      reset();
      setSent(true);
    } catch (failure) {
      for (const [key, message] of Object.entries(failure.fields || {}))
        setError(key, { message }, { shouldFocus: true });
      setError('root', {
        message: failure.status
          ? failure.message
          : 'We could not confirm whether your message was sent. Please wait before trying again.',
      });
    }
  };
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className="mt-8 min-w-0 scroll-mt-8 rounded-3xl border border-line bg-panel p-6 sm:p-10"
    >
      <div className="grid min-w-0 gap-8 lg:grid-cols-[minmax(0,.7fr)_minmax(0,1fr)] lg:gap-14">
        <div>
          <p className="font-mono text-[10px] font-medium tracking-widest text-muted">LET’S TALK</p>
          <h2
            id={`${id}-title`}
            className="mt-3 font-display text-3xl font-semibold tracking-tight"
          >
            Have something in mind?
          </h2>
          <p className="mt-4 max-w-md text-sm leading-7 text-muted">
            Send {name || username} a message about a project, an opportunity, or an idea worth
            exploring.
          </p>
          <p id={`${id}-privacy`} className="mt-4 max-w-md text-xs leading-6 text-quiet">
            Your name, email and message will be shared with this portfolio’s owner so they can
            reply. Fields marked * are required.
          </p>
        </div>
        <form
          onSubmit={handleSubmit(submit)}
          noValidate
          aria-describedby={`${id}-privacy`}
          aria-busy={isSubmitting}
          className="min-w-0"
          onChange={() => setSent(false)}
        >
          <fieldset disabled={isSubmitting} className="grid min-w-0 gap-5 sm:grid-cols-2">
            <div className="hidden" aria-hidden="true">
              <label htmlFor={`${id}-website`}>Leave this field empty</label>
              <input
                id={`${id}-website`}
                tabIndex={-1}
                autoComplete="off"
                {...register('website')}
              />
            </div>
            {[
              ['name', 'Your name', 'text', 100, 'name'],
              ['email', 'Your email', 'email', 254, 'email'],
              ['subject', 'Subject', 'text', 120, 'off'],
              ['message', 'Message', 'textarea', 3000, 'off'],
            ].map(([key, label, type, maxLength, autoComplete]) => (
              <div
                key={key}
                className={`min-w-0 ${['subject', 'message'].includes(key) ? 'sm:col-span-2' : ''}`}
              >
                <label htmlFor={`${id}-${key}`} className="block text-xs font-semibold text-label">
                  {label} *
                </label>
                {type === 'textarea' ? (
                  <textarea
                    id={`${id}-${key}`}
                    rows={5}
                    maxLength={maxLength}
                    {...register(key)}
                    aria-invalid={Boolean(errors[key])}
                    aria-describedby={errors[key] ? `${id}-${key}-error` : undefined}
                    className={`${inputStyle} resize-y`}
                  />
                ) : (
                  <input
                    id={`${id}-${key}`}
                    type={type}
                    autoComplete={autoComplete}
                    maxLength={maxLength}
                    {...register(key)}
                    aria-invalid={Boolean(errors[key])}
                    aria-describedby={errors[key] ? `${id}-${key}-error` : undefined}
                    className={inputStyle}
                  />
                )}
                {errors[key] && (
                  <p id={`${id}-${key}-error`} role="alert" className="mt-2 text-xs text-danger">
                    {errors[key].message}
                  </p>
                )}
              </div>
            ))}
          </fieldset>
          {errors.root && (
            <p
              role="alert"
              className="mt-5 rounded-lg border border-danger-line bg-danger-bg p-4 text-sm text-danger"
            >
              {errors.root.message}
            </p>
          )}
          {sent && (
            <p role="status" className="mt-5 rounded-lg bg-soft p-4 text-sm text-success">
              Message sent. Thanks for reaching out.
            </p>
          )}
          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-6 min-h-11 cursor-pointer rounded-xl bg-action px-6 py-3 text-sm font-semibold text-action-ink hover:bg-action-hover focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus disabled:cursor-wait disabled:opacity-60"
          >
            {isSubmitting ? 'Sending…' : 'Send message'}
          </button>
        </form>
      </div>
    </section>
  );
}
