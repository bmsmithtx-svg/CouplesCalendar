import { useState, type SyntheticEvent } from 'react';

import { Button } from '../../components/ui/Button';
import { StatusBanner } from '../../components/ui/StatusBanner';
import { TextField } from '../../components/ui/Fields';
import { useAuth } from './AuthContext';

type AuthMode = 'reset-password' | 'sign-in' | 'sign-up';

type AuthFieldErrors = {
  email?: string | undefined;
  password?: string | undefined;
};

const passwordMinLength = 8;
const passwordMinLengthLabel = String(passwordMinLength);

const authModeOptions: ReadonlyArray<{ label: string; value: AuthMode }> = [
  { label: 'Sign in', value: 'sign-in' },
  { label: 'Create account', value: 'sign-up' },
  { label: 'Reset password', value: 'reset-password' },
];

function validateEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validateAuthForm(mode: AuthMode, email: string, password: string) {
  const fieldErrors: AuthFieldErrors = {};
  const trimmedEmail = email.trim();

  if (!trimmedEmail) {
    fieldErrors.email = 'Enter your email address.';
  } else if (!validateEmail(trimmedEmail)) {
    fieldErrors.email = 'Enter a valid email address.';
  }

  if (mode !== 'reset-password') {
    if (!password) {
      fieldErrors.password = 'Enter your password.';
    } else if (mode === 'sign-up' && password.length < passwordMinLength) {
      fieldErrors.password = `Use at least ${passwordMinLengthLabel} characters.`;
    }
  }

  return {
    fieldErrors,
    isValid: !fieldErrors.email && !fieldErrors.password,
  };
}

function getSubmitLabel(mode: AuthMode) {
  if (mode === 'sign-up') {
    return 'Create account';
  }

  if (mode === 'reset-password') {
    return 'Send reset email';
  }

  return 'Sign in';
}

export function AuthScreen({ sessionMessage }: { sessionMessage: string | null }) {
  const { resetPassword, signIn, signUp, state } = useAuth();
  const [mode, setMode] = useState<AuthMode>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<AuthFieldErrors>({});

  const operation = state.status === 'unauthenticated' ? state.operation : 'idle';
  const isBusy = operation !== 'idle';
  const safeError = state.status === 'unauthenticated' ? state.error : undefined;
  const notice = state.status === 'unauthenticated' ? state.notice : undefined;

  function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    void submitAuthForm();
  }

  async function submitAuthForm() {
    const validation = validateAuthForm(mode, email, password);
    setFieldErrors(validation.fieldErrors);

    if (!validation.isValid) {
      return;
    }

    const trimmedEmail = email.trim();

    if (mode === 'sign-up') {
      await signUp({ email: trimmedEmail, password });
      return;
    }

    if (mode === 'reset-password') {
      await resetPassword(trimmedEmail);
      return;
    }

    await signIn({ email: trimmedEmail, password });
  }

  return (
    <main className="cc-auth-page" aria-labelledby="auth-title">
      <section className="cc-auth-card" aria-describedby="auth-description">
        <p className="cc-eyebrow">CouplesCalendar</p>
        <h1 className="cc-auth-card__title" id="auth-title">
          Sign in to your private calendar
        </h1>
        <p className="cc-auth-card__description" id="auth-description">
          Accounts use Supabase Auth. Calendar surfaces stay hidden until your session and profile
          are ready.
        </p>

        <div className="cc-auth-mode" aria-label="Authentication mode">
          {authModeOptions.map(({ label, value }) => (
            <button
              aria-pressed={mode === value}
              className="cc-auth-mode__button"
              disabled={isBusy}
              key={value}
              onClick={() => {
                setMode(value);
                setFieldErrors({});
              }}
              type="button"
            >
              {label}
            </button>
          ))}
        </div>

        {sessionMessage ? (
          <StatusBanner title="Session ended" tone="warning">
            <p>{sessionMessage}</p>
          </StatusBanner>
        ) : null}

        {notice ? (
          <StatusBanner title="Check your email" tone="success">
            <p>{notice}</p>
          </StatusBanner>
        ) : null}

        {safeError ? (
          <StatusBanner title="Authentication failed" tone="error">
            <p>{safeError}</p>
          </StatusBanner>
        ) : null}

        <form
          aria-label="Authentication form"
          className="cc-auth-form"
          noValidate
          onSubmit={handleSubmit}
        >
          <TextField
            autoComplete="email"
            error={fieldErrors.email}
            inputMode="email"
            label="Email"
            onChange={(event) => {
              setEmail(event.currentTarget.value);
            }}
            placeholder="you@example.com"
            required
            type="email"
            value={email}
          />
          {mode !== 'reset-password' ? (
            <TextField
              autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'}
              error={fieldErrors.password}
              hint={
                mode === 'sign-up'
                  ? `Use at least ${passwordMinLengthLabel} characters.`
                  : undefined
              }
              label="Password"
              onChange={(event) => {
                setPassword(event.currentTarget.value);
              }}
              required
              type="password"
              value={password}
            />
          ) : null}
          <Button isLoading={isBusy} type="submit" variant="primary">
            {getSubmitLabel(mode)}
          </Button>
        </form>
      </section>
    </main>
  );
}
