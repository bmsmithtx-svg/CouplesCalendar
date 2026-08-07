import { Button } from '../../components/ui/Button';
import { StatusBanner } from '../../components/ui/StatusBanner';
import { useAuth } from '../auth/AuthContext';
import { ProfileForm } from './ProfileForm';

export function ProfileSetupScreen() {
  const { saveProfile, signOut, state } = useAuth();

  if (state.status !== 'profile-required') {
    return null;
  }

  return (
    <main className="cc-auth-page" aria-labelledby="profile-setup-title">
      <section className="cc-auth-card" aria-describedby="profile-setup-description">
        <p className="cc-eyebrow">Profile setup</p>
        <h1 className="cc-auth-card__title" id="profile-setup-title">
          Complete your profile
        </h1>
        <p className="cc-auth-card__description" id="profile-setup-description">
          A display name and default timezone are required before authenticated app content loads.
        </p>

        <StatusBanner title="Signed in" tone="info">
          <p>{state.session.user.email ?? 'Supabase account'} is ready for profile setup.</p>
        </StatusBanner>

        {state.error ? (
          <StatusBanner title="Profile save failed" tone="error">
            <p>{state.error}</p>
          </StatusBanner>
        ) : null}

        <ProfileForm
          initialProfile={null}
          isSaving={state.operation === 'saving-profile'}
          onSubmit={saveProfile}
          submitLabel="Save profile"
        />

        <Button
          onClick={() => {
            void signOut();
          }}
          variant="ghost"
        >
          Sign out
        </Button>
      </section>
    </main>
  );
}
