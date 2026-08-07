import type { ReactNode } from 'react';

import { Button } from '../../components/ui/Button';
import { LoadingIndicator, SkeletonStack } from '../../components/ui/LoadingStates';
import { StatusBanner } from '../../components/ui/StatusBanner';
import { ProfileSetupScreen } from '../profiles/ProfileSetupScreen';
import { AuthScreen } from './AuthScreen';
import { useAuth } from './AuthContext';

function StandaloneFrame({
  children,
  description,
  title,
}: {
  children: ReactNode;
  description: string;
  title: string;
}) {
  return (
    <main className="cc-auth-page" aria-labelledby="auth-page-title">
      <section className="cc-auth-card" aria-describedby="auth-page-description">
        <p className="cc-eyebrow">CouplesCalendar</p>
        <h1 className="cc-auth-card__title" id="auth-page-title">
          {title}
        </h1>
        <p className="cc-auth-card__description" id="auth-page-description">
          {description}
        </p>
        {children}
      </section>
    </main>
  );
}

export function AuthGate({ children }: { children: ReactNode }) {
  const { retryInitialSession, retryProfile, signOut, state } = useAuth();

  if (state.status === 'checking-session') {
    return (
      <StandaloneFrame
        description="Checking whether a valid Supabase Auth session is available."
        title="Opening your calendar"
      >
        <LoadingIndicator label="Checking session" />
        <SkeletonStack count={3} label="Session startup placeholder" />
      </StandaloneFrame>
    );
  }

  if (state.status === 'configuration-error') {
    return (
      <StandaloneFrame
        description="Authentication needs browser-safe Supabase configuration before private surfaces can load."
        title="Configuration required"
      >
        <StatusBanner title="Missing Supabase configuration" tone="error">
          <p>{state.message}</p>
        </StatusBanner>
        <div className="cc-config-list" aria-label="Missing environment variables">
          {state.missing.map((name) => (
            <code key={name}>{name}</code>
          ))}
        </div>
        <Button
          onClick={() => {
            void retryInitialSession();
          }}
          variant="secondary"
        >
          Check again
        </Button>
      </StandaloneFrame>
    );
  }

  if (state.status === 'unauthenticated' || state.status === 'session-invalid') {
    return (
      <AuthScreen sessionMessage={state.status === 'session-invalid' ? state.message : null} />
    );
  }

  if (state.status === 'profile-loading') {
    return (
      <StandaloneFrame
        description="Loading the user-owned profile protected by row-level security."
        title="Loading your profile"
      >
        <LoadingIndicator label="Loading profile" />
        <SkeletonStack count={3} label="Profile loading placeholder" />
      </StandaloneFrame>
    );
  }

  if (state.status === 'profile-error') {
    return (
      <StandaloneFrame
        description="Your account is signed in, but the profile could not be loaded."
        title="Profile unavailable"
      >
        <StatusBanner title="Profile loading failed" tone="error">
          <p>{state.message}</p>
        </StatusBanner>
        <div className="cc-auth-actions">
          <Button
            onClick={() => {
              void retryProfile();
            }}
            variant="primary"
          >
            Retry profile
          </Button>
          <Button
            onClick={() => {
              void signOut();
            }}
            variant="secondary"
          >
            Sign out
          </Button>
        </div>
      </StandaloneFrame>
    );
  }

  if (state.status === 'profile-required') {
    return <ProfileSetupScreen />;
  }

  return children;
}
