import type { UserProfile } from '../profiles/profileTypes';

export type AuthUser = {
  email: string | null;
  id: string;
};

export type AuthSession = {
  expiresAt: number | null;
  user: AuthUser;
};

export type AuthCredentials = {
  email: string;
  password: string;
};

export type InitialSessionResult =
  | {
      status: 'session';
      session: AuthSession;
    }
  | {
      status: 'none';
    }
  | {
      status: 'expired';
    }
  | {
      status: 'invalid';
      message: string;
    };

export type AuthResult =
  | {
      status: 'session';
      session: AuthSession;
    }
  | {
      status: 'confirmation-required';
    };

export type AuthEvent =
  | 'INITIAL_SESSION'
  | 'MFA_CHALLENGE_VERIFIED'
  | 'PASSWORD_RECOVERY'
  | 'SIGNED_IN'
  | 'SIGNED_OUT'
  | 'TOKEN_REFRESHED'
  | 'USER_UPDATED';

export type AuthSubscription = {
  unsubscribe: () => void;
};

export type AuthClient = {
  getInitialSession: () => Promise<InitialSessionResult>;
  onAuthStateChange: (
    callback: (event: AuthEvent, session: AuthSession | null) => void,
  ) => AuthSubscription;
  resetPassword: (email: string) => Promise<void>;
  signIn: (credentials: AuthCredentials) => Promise<AuthResult>;
  signOut: () => Promise<void>;
  signUp: (credentials: AuthCredentials) => Promise<AuthResult>;
};

export type AuthState =
  | {
      status: 'checking-session';
    }
  | {
      status: 'configuration-error';
      message: string;
      missing: string[];
    }
  | {
      status: 'unauthenticated';
      error?: string | undefined;
      notice?: string | undefined;
      operation: 'idle' | 'sending-reset' | 'signing-in' | 'signing-up';
    }
  | {
      status: 'session-invalid';
      message: string;
    }
  | {
      status: 'profile-loading';
      session: AuthSession;
    }
  | {
      status: 'profile-required';
      error?: string | undefined;
      operation: 'idle' | 'saving-profile';
      session: AuthSession;
    }
  | {
      status: 'profile-error';
      message: string;
      session: AuthSession;
    }
  | {
      status: 'authenticated';
      error?: string | undefined;
      notice?: string | undefined;
      operation: 'idle' | 'saving-profile' | 'signing-out';
      profile: UserProfile;
      session: AuthSession;
    };
