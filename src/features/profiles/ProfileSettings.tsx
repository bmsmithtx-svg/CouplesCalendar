import { Button } from '../../components/ui/Button';
import { StatusBanner } from '../../components/ui/StatusBanner';
import { useAuth } from '../auth/AuthContext';
import { ProfileForm } from './ProfileForm';

export function ProfileSettings() {
  const { saveProfile, signOut, state } = useAuth();

  if (state.status !== 'authenticated') {
    return null;
  }

  return (
    <div className="cc-settings-stack">
      <StatusBanner title="Account" tone="info">
        <p>{state.session.user.email ?? 'Supabase account'}</p>
      </StatusBanner>

      {state.notice ? (
        <StatusBanner title="Profile saved" tone="success">
          <p>{state.notice}</p>
        </StatusBanner>
      ) : null}

      {state.error ? (
        <StatusBanner title="Settings action failed" tone="error">
          <p>{state.error}</p>
        </StatusBanner>
      ) : null}

      <ProfileForm
        initialProfile={state.profile}
        isSaving={state.operation === 'saving-profile'}
        key={`${state.profile.id}:${state.profile.updatedAt}`}
        onSubmit={saveProfile}
        submitLabel="Save profile"
      />

      <div className="cc-account-actions">
        <div>
          <p className="cc-account-actions__title">Session</p>
          <p className="cc-account-actions__description">
            Signing out clears authenticated app state on this device.
          </p>
        </div>
        <Button
          isLoading={state.operation === 'signing-out'}
          onClick={() => {
            void signOut();
          }}
          variant="destructive"
        >
          Sign out
        </Button>
      </div>
    </div>
  );
}
