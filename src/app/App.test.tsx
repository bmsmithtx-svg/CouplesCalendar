import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type {
  AuthClient,
  AuthEvent,
  AuthResult,
  AuthSession,
  InitialSessionResult,
} from '../features/auth/authTypes';
import type { CalendarRepository } from '../features/calendar/calendarTypes';
import type {
  CoupleMember,
  CoupleRelationship,
  CoupleRepository,
  IncomingInvitation,
} from '../features/couples/coupleTypes';
import type {
  ProfileInput,
  ProfileRepository,
  UserProfile,
} from '../features/profiles/profileTypes';
import App from './App';

const authSession: AuthSession = {
  expiresAt: Math.floor(Date.now() / 1000) + 3600,
  user: {
    email: 'alex@example.com',
    id: 'user-1',
  },
};

const userProfile: UserProfile = {
  createdAt: '2026-08-06T12:00:00.000Z',
  defaultTimezone: 'America/Chicago',
  displayName: 'Alex',
  id: 'user-1',
  updatedAt: '2026-08-06T12:00:00.000Z',
};

const alexMember = {
  activeMemberSlot: 1,
  displayName: 'Alex',
  id: 'member-1',
  joinedAt: '2026-08-08T12:00:00.000Z',
  userId: 'user-1',
} satisfies CoupleMember;

const jordanMember = {
  activeMemberSlot: 2,
  displayName: 'Jordan',
  id: 'member-2',
  joinedAt: '2026-08-08T12:05:00.000Z',
  userId: 'user-2',
} satisfies CoupleMember;

const coupleMembers = [alexMember, jordanMember];

function createCoupleSummary(name = 'Alex and Jordan') {
  return {
    createdAt: '2026-08-08T12:00:00.000Z',
    createdBy: 'user-1',
    id: 'couple-1',
    name,
    updatedAt: '2026-08-08T12:00:00.000Z',
  };
}

function createSoloRelationship(name = 'Alex and Jordan'): CoupleRelationship {
  return {
    canInvite: true,
    couple: createCoupleSummary(name),
    kind: 'solo',
    members: [alexMember],
    pendingInvitation: null,
  };
}

function createPendingRelationship(): CoupleRelationship {
  return {
    canInvite: true,
    couple: createCoupleSummary(),
    invitation: {
      createdAt: '2026-08-08T12:10:00.000Z',
      createdBy: 'user-1',
      expiresAt: '2026-08-15T12:10:00.000Z',
      id: 'invitation-1',
    },
    kind: 'pending_outgoing',
    members: [alexMember],
  };
}

function createEstablishedRelationship(): CoupleRelationship {
  return {
    couple: createCoupleSummary(),
    kind: 'established',
    members: coupleMembers,
  };
}

function createAuthClient(
  initialSession: InitialSessionResult | Promise<InitialSessionResult> = {
    session: authSession,
    status: 'session',
  },
) {
  let callback: ((event: AuthEvent, session: AuthSession | null) => void) | null = null;
  const unsubscribe = vi.fn(() => undefined);
  const authClient: AuthClient = {
    getInitialSession: vi.fn(() => Promise.resolve(initialSession)),
    onAuthStateChange: vi.fn(
      (nextCallback: (event: AuthEvent, session: AuthSession | null) => void) => {
        callback = nextCallback;
        return { unsubscribe };
      },
    ),
    resetPassword: vi.fn(() => Promise.resolve()),
    signIn: vi.fn(() =>
      Promise.resolve<AuthResult>({
        session: authSession,
        status: 'session',
      }),
    ),
    signOut: vi.fn(() => Promise.resolve()),
    signUp: vi.fn(() =>
      Promise.resolve<AuthResult>({
        session: authSession,
        status: 'session',
      }),
    ),
  };

  return {
    authClient,
    emitAuthEvent: (event: AuthEvent, session: AuthSession | null) => {
      callback?.(event, session);
    },
    unsubscribe,
  };
}

function createProfileRepository(
  profile: UserProfile | null | Promise<UserProfile | null> = userProfile,
) {
  const profileRepository: ProfileRepository = {
    getOwnProfile: vi.fn(() => Promise.resolve(profile)),
    saveOwnProfile: vi.fn((_userId: string, input: ProfileInput) =>
      Promise.resolve({
        ...userProfile,
        defaultTimezone: input.defaultTimezone,
        displayName: input.displayName,
        updatedAt: '2026-08-06T13:00:00.000Z',
      }),
    ),
  };

  return profileRepository;
}

function createCoupleRepository({
  incomingInvitation = {
    expiresAt: '2026-08-15T12:10:00.000Z',
    status: 'pending',
    token: 'valid-token',
  },
  relationship = {
    kind: 'not_coupled',
  },
}: {
  incomingInvitation?: IncomingInvitation;
  relationship?: CoupleRelationship;
} = {}) {
  let relationshipState = relationship;
  const coupleRepository: CoupleRepository = {
    acceptInvitation: vi.fn(() => {
      relationshipState = createEstablishedRelationship();

      return Promise.resolve({
        coupleId: 'couple-1',
        invitationId: 'invitation-1',
        status: 'accepted' as const,
      });
    }),
    createCouple: vi.fn((name: string) => {
      relationshipState = createSoloRelationship(name);

      return Promise.resolve();
    }),
    createInvitation: vi.fn(() => {
      relationshipState = createPendingRelationship();

      return Promise.resolve({
        coupleId: 'couple-1',
        createdAt: '2026-08-08T12:10:00.000Z',
        expiresAt: '2026-08-15T12:10:00.000Z',
        id: 'invitation-1',
        token: 'valid-token',
      });
    }),
    deleteCouple: vi.fn(() => {
      relationshipState = { kind: 'not_coupled' };

      return Promise.resolve();
    }),
    getRelationshipState: vi.fn(() => Promise.resolve(relationshipState)),
    inspectInvitation: vi.fn((token: string) => {
      if (incomingInvitation.status === 'declined') {
        return Promise.resolve(incomingInvitation);
      }

      return Promise.resolve({
        ...incomingInvitation,
        token,
      });
    }),
    leaveCouple: vi.fn(() => {
      relationshipState = { kind: 'not_coupled' };

      return Promise.resolve();
    }),
    revokeInvitation: vi.fn(() => {
      relationshipState = createSoloRelationship();

      return Promise.resolve();
    }),
  };

  return coupleRepository;
}

function createCalendarRepository() {
  return {
    listEventsForCouple: vi.fn(() => Promise.resolve([])),
  } satisfies CalendarRepository;
}

function renderApp({
  authClient = createAuthClient().authClient,
  calendarRepository = createCalendarRepository(),
  coupleRepository = createCoupleRepository(),
  profileRepository = createProfileRepository(),
  url = '/',
}: {
  authClient?: AuthClient;
  calendarRepository?: CalendarRepository;
  coupleRepository?: CoupleRepository;
  profileRepository?: ProfileRepository;
  url?: string;
} = {}) {
  window.history.replaceState({}, '', url);

  return render(
    <App
      authClient={authClient}
      calendarRepository={calendarRepository}
      coupleRepository={coupleRepository}
      profileRepository={profileRepository}
    />,
  );
}

describe('App authentication and profile boundary', () => {
  it('renders the initial authentication loading state without protected content', () => {
    const { authClient } = createAuthClient(new Promise<InitialSessionResult>(() => undefined));

    renderApp({ authClient });

    expect(screen.getByRole('main', { name: 'Opening your calendar' })).toBeInTheDocument();
    expect(screen.getByText('Checking session')).toBeInTheDocument();
    expect(
      screen.queryByRole('navigation', { name: 'Phone primary navigation' }),
    ).not.toBeInTheDocument();
  });

  it('renders the unauthenticated experience and hides protected app content', async () => {
    const { authClient } = createAuthClient({ status: 'none' });

    renderApp({ authClient });

    expect(
      await screen.findByRole('heading', { name: 'Sign in to your private calendar' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('navigation', { name: 'Phone primary navigation' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: 'Design system preview' }),
    ).not.toBeInTheDocument();
  });

  it('restores a valid session and renders the authenticated shell', async () => {
    const { authClient } = createAuthClient();
    const profileRepository = createProfileRepository();
    const coupleRepository = createCoupleRepository();

    renderApp({ authClient, coupleRepository, profileRepository });

    expect(await screen.findByRole('main', { name: 'Calendar workspace' })).toBeInTheDocument();
    expect(
      screen.getByRole('navigation', { name: 'Phone primary navigation' }),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole('button', { name: 'Create couple workspace' }),
    ).toBeInTheDocument();
    expect(profileRepository.getOwnProfile).toHaveBeenCalledWith('user-1');
    expect(coupleRepository.getRelationshipState).toHaveBeenCalledWith('user-1');
  });

  it('supports successful sign-in from the unauthenticated screen', async () => {
    const { authClient } = createAuthClient({ status: 'none' });
    const profileRepository = createProfileRepository();

    renderApp({ authClient, profileRepository });

    await screen.findByRole('form', { name: 'Authentication form' });
    fireEvent.change(screen.getByLabelText(/Email/), {
      target: { value: 'alex@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/Password/), {
      target: { value: 'correct-password' },
    });
    fireEvent.click(
      within(screen.getByRole('form', { name: 'Authentication form' })).getByRole('button', {
        name: 'Sign in',
      }),
    );

    expect(
      await screen.findByRole('button', { name: 'Create couple workspace' }),
    ).toBeInTheDocument();
    expect(authClient.signIn).toHaveBeenCalledWith({
      email: 'alex@example.com',
      password: 'correct-password',
    });
  });

  it('supports account creation before profile completion', async () => {
    const { authClient } = createAuthClient({ status: 'none' });
    const profileRepository = createProfileRepository(null);

    renderApp({ authClient, profileRepository });

    await screen.findByRole('form', { name: 'Authentication form' });
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));
    fireEvent.change(screen.getByLabelText(/Email/), {
      target: { value: 'new@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/Password/), {
      target: { value: 'long-enough-password' },
    });
    fireEvent.click(
      within(screen.getByRole('form', { name: 'Authentication form' })).getByRole('button', {
        name: 'Create account',
      }),
    );

    expect(
      await screen.findByRole('heading', { name: 'Complete your profile' }),
    ).toBeInTheDocument();
    expect(authClient.signUp).toHaveBeenCalledWith({
      email: 'new@example.com',
      password: 'long-enough-password',
    });
  });

  it('shows sign-in validation errors before calling the provider', async () => {
    const { authClient } = createAuthClient({ status: 'none' });

    renderApp({ authClient });

    await screen.findByRole('form', { name: 'Authentication form' });
    fireEvent.change(screen.getByLabelText(/Email/), {
      target: { value: 'not-an-email' },
    });
    fireEvent.click(
      within(screen.getByRole('form', { name: 'Authentication form' })).getByRole('button', {
        name: 'Sign in',
      }),
    );

    expect(screen.getByText('Enter a valid email address.')).toBeInTheDocument();
    expect(authClient.signIn).not.toHaveBeenCalled();
  });

  it('maps provider authentication failures to safe UI errors', async () => {
    const { authClient } = createAuthClient({ status: 'none' });
    vi.mocked(authClient.signIn).mockRejectedValueOnce(new Error('Invalid login credentials'));

    renderApp({ authClient });

    await screen.findByRole('form', { name: 'Authentication form' });
    fireEvent.change(screen.getByLabelText(/Email/), {
      target: { value: 'alex@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/Password/), {
      target: { value: 'wrong-password' },
    });
    fireEvent.click(
      within(screen.getByRole('form', { name: 'Authentication form' })).getByRole('button', {
        name: 'Sign in',
      }),
    );

    expect(
      await screen.findByText('The email or password did not match an account.'),
    ).toBeInTheDocument();
  });

  it('signs out and removes protected content', async () => {
    const { authClient } = createAuthClient();

    renderApp({ authClient });

    const desktopNav = await screen.findByRole('navigation', {
      name: 'Desktop primary navigation',
    });
    fireEvent.click(within(desktopNav).getByRole('button', { name: 'Settings' }));

    const settingsMain = screen.getByRole('main', { name: 'Profile settings' });
    fireEvent.click(within(settingsMain).getByRole('button', { name: 'Sign out' }));

    expect(
      await screen.findByRole('heading', { name: 'Sign in to your private calendar' }),
    ).toBeInTheDocument();
    expect(authClient.signOut).toHaveBeenCalled();
    expect(
      screen.queryByRole('navigation', { name: 'Phone primary navigation' }),
    ).not.toBeInTheDocument();
  });

  it('shows an expired or invalid session state without rendering the app shell', async () => {
    const { authClient } = createAuthClient({ status: 'expired' });

    renderApp({ authClient });

    expect(
      await screen.findByText('Your session has expired. Sign in again to continue.'),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('navigation', { name: 'Phone primary navigation' }),
    ).not.toBeInTheDocument();
  });

  it('handles auth state session invalidation after the shell is visible', async () => {
    const { authClient, emitAuthEvent } = createAuthClient();

    renderApp({ authClient });

    expect(
      await screen.findByRole('button', { name: 'Create couple workspace' }),
    ).toBeInTheDocument();
    emitAuthEvent('SIGNED_OUT', null);

    expect(
      await screen.findByText('Your session ended. Sign in again to continue.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('main', { name: 'Calendar workspace' })).not.toBeInTheDocument();
  });

  it('renders the profile loading state before profile data resolves', async () => {
    const profileRepository = createProfileRepository(
      new Promise<UserProfile | null>(() => undefined),
    );

    renderApp({ profileRepository });

    expect(await screen.findByRole('main', { name: 'Loading your profile' })).toBeInTheDocument();
    expect(screen.getByText('Loading profile')).toBeInTheDocument();
  });

  it('creates a missing profile before exposing authenticated app content', async () => {
    const profileRepository = createProfileRepository(null);

    renderApp({ profileRepository });

    expect(
      await screen.findByRole('heading', { name: 'Complete your profile' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('main', { name: 'Calendar workspace' })).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Display name/), {
      target: { value: 'Alex Smith' },
    });
    fireEvent.change(screen.getByLabelText(/Default timezone/), {
      target: { value: 'America/Chicago' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save profile' }));

    expect(await screen.findByRole('main', { name: 'Calendar workspace' })).toBeInTheDocument();
    expect(profileRepository.saveOwnProfile).toHaveBeenCalledWith('user-1', {
      defaultTimezone: 'America/Chicago',
      displayName: 'Alex Smith',
    });
  });

  it('updates the profile from settings and shows success feedback', async () => {
    const profileRepository = createProfileRepository();

    renderApp({ profileRepository });

    const desktopNav = await screen.findByRole('navigation', {
      name: 'Desktop primary navigation',
    });
    fireEvent.click(within(desktopNav).getByRole('button', { name: 'Settings' }));
    fireEvent.change(screen.getByLabelText(/Display name/), {
      target: { value: 'Alex Updated' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save profile' }));

    expect(await screen.findByText('Profile saved.')).toBeInTheDocument();
    expect(profileRepository.saveOwnProfile).toHaveBeenCalledWith('user-1', {
      defaultTimezone: 'America/Chicago',
      displayName: 'Alex Updated',
    });
  });

  it('creates a couple workspace before showing invitation management', async () => {
    const coupleRepository = createCoupleRepository();

    renderApp({ coupleRepository });

    await screen.findByRole('button', { name: 'Create couple workspace' });
    fireEvent.change(screen.getByLabelText(/Couple name/), {
      target: { value: 'Home Team' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Create couple workspace' }));

    expect(
      await screen.findByRole('button', { name: 'Create invitation link' }),
    ).toBeInTheDocument();
    expect(coupleRepository.createCouple).toHaveBeenCalledWith('Home Team');
  });

  it('creates an outgoing invitation link for a solo couple', async () => {
    const coupleRepository = createCoupleRepository({
      relationship: createSoloRelationship(),
    });

    renderApp({ coupleRepository });

    fireEvent.click(await screen.findByRole('button', { name: 'Create invitation link' }));

    expect(await screen.findByDisplayValue(/invite=valid-token/)).toBeInTheDocument();
    expect(
      screen.getByText('Partner access is pending until the invitation is accepted.'),
    ).toBeInTheDocument();
    expect(coupleRepository.createInvitation).toHaveBeenCalled();
  });

  it('accepts a valid incoming invitation for an uncoupled user', async () => {
    const coupleRepository = createCoupleRepository();

    renderApp({ coupleRepository, url: '/?invite=valid-token' });

    expect(await screen.findByText('Couple invitation received')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Accept invitation' }));

    expect(await screen.findByText('Couple established')).toBeInTheDocument();
    expect(coupleRepository.acceptInvitation).toHaveBeenCalledWith('valid-token');
    expect(window.location.search).toBe('');
  });

  it('shows an expired incoming invitation without accepting it', async () => {
    const coupleRepository = createCoupleRepository({
      incomingInvitation: {
        expiresAt: '2026-08-01T12:10:00.000Z',
        status: 'expired',
        token: 'expired-token',
      },
    });

    renderApp({ coupleRepository, url: '/?invite=expired-token' });

    expect(await screen.findByText('Invitation expired')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create couple workspace' })).toBeInTheDocument();
    expect(coupleRepository.acceptInvitation).not.toHaveBeenCalled();
  });

  it('blocks invitation acceptance when the signed-in user is already coupled', async () => {
    const coupleRepository = createCoupleRepository({
      relationship: createEstablishedRelationship(),
    });

    renderApp({ coupleRepository, url: '/?invite=valid-token' });

    expect(await screen.findByText('Already coupled')).toBeInTheDocument();
    expect(screen.getByText('Couple established')).toBeInTheDocument();
    expect(coupleRepository.acceptInvitation).not.toHaveBeenCalled();
  });

  it('renders shared calendar viewing for an established couple', async () => {
    const calendarRepository = createCalendarRepository();
    const coupleRepository = createCoupleRepository({
      relationship: createEstablishedRelationship(),
    });

    renderApp({ calendarRepository, coupleRepository });

    const calendarMain = await screen.findByRole('main', { name: 'Calendar workspace' });

    expect(
      within(calendarMain).getByRole('heading', { name: 'Shared calendar' }),
    ).toBeInTheDocument();
    expect(await within(calendarMain).findByText('Alex and Jordan')).toBeInTheDocument();
    expect(await screen.findByText('No shared events yet')).toBeInTheDocument();
    expect(calendarRepository.listEventsForCouple).toHaveBeenCalledWith(
      expect.objectContaining({
        coupleId: 'couple-1',
      }),
    );
  });

  it('shows profile validation errors before saving', async () => {
    const profileRepository = createProfileRepository();

    renderApp({ profileRepository });

    const desktopNav = await screen.findByRole('navigation', {
      name: 'Desktop primary navigation',
    });
    fireEvent.click(within(desktopNav).getByRole('button', { name: 'Settings' }));
    fireEvent.change(screen.getByLabelText(/Display name/), {
      target: { value: ' ' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save profile' }));

    expect(screen.getByText('Enter a display name.')).toBeInTheDocument();
    expect(profileRepository.saveOwnProfile).not.toHaveBeenCalled();
  });

  it('maps profile provider failures to safe UI errors', async () => {
    const profileRepository = createProfileRepository();
    vi.mocked(profileRepository.getOwnProfile).mockRejectedValueOnce(
      new Error('permission denied for table profiles'),
    );

    renderApp({ profileRepository });

    expect(
      await screen.findByText('Your profile could not be accessed with the current session.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('main', { name: 'Calendar workspace' })).not.toBeInTheDocument();
  });

  it('cleans up the authentication subscription on unmount', async () => {
    const { authClient, unsubscribe } = createAuthClient();
    const { unmount } = renderApp({ authClient });

    await waitFor(() => {
      expect(authClient.onAuthStateChange).toHaveBeenCalled();
    });

    unmount();

    expect(unsubscribe).toHaveBeenCalled();
  });

  it('does not fetch a profile after initial session resolution post-unmount', async () => {
    let resolveInitialSession: (result: InitialSessionResult) => void = () => undefined;
    const pendingInitialSession = new Promise<InitialSessionResult>((resolve) => {
      resolveInitialSession = resolve;
    });
    const { authClient, unsubscribe } = createAuthClient(pendingInitialSession);
    const profileRepository = createProfileRepository();
    const { unmount } = renderApp({ authClient, profileRepository });

    await waitFor(() => {
      expect(authClient.getInitialSession).toHaveBeenCalled();
    });

    unmount();

    await act(() => {
      resolveInitialSession({
        session: authSession,
        status: 'session',
      });
      return Promise.resolve();
    });

    expect(unsubscribe).toHaveBeenCalled();
    expect(profileRepository.getOwnProfile).not.toHaveBeenCalled();
  });
});
