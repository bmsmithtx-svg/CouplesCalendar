import { AuthGate } from '../features/auth/AuthGate';
import { AuthProvider } from '../features/auth/AuthProvider';
import type { AuthClient } from '../features/auth/authTypes';
import type { ProfileRepository } from '../features/profiles/profileTypes';
import { AppShell } from './AppShell';

export default function App({
  authClient,
  profileRepository,
}: {
  authClient?: AuthClient | undefined;
  profileRepository?: ProfileRepository | undefined;
} = {}) {
  return (
    <AuthProvider authClient={authClient} profileRepository={profileRepository}>
      <AuthGate>
        <AppShell />
      </AuthGate>
    </AuthProvider>
  );
}
