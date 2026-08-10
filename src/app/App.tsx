import { AuthGate } from '../features/auth/AuthGate';
import { AuthProvider } from '../features/auth/AuthProvider';
import type { AuthClient } from '../features/auth/authTypes';
import { CoupleProvider } from '../features/couples/CoupleProvider';
import type { CoupleRepository } from '../features/couples/coupleTypes';
import type { ProfileRepository } from '../features/profiles/profileTypes';
import { AppShell } from './AppShell';

export default function App({
  authClient,
  coupleRepository,
  profileRepository,
}: {
  authClient?: AuthClient | undefined;
  coupleRepository?: CoupleRepository | undefined;
  profileRepository?: ProfileRepository | undefined;
} = {}) {
  return (
    <AuthProvider authClient={authClient} profileRepository={profileRepository}>
      <AuthGate>
        <CoupleProvider repository={coupleRepository}>
          <AppShell />
        </CoupleProvider>
      </AuthGate>
    </AuthProvider>
  );
}
