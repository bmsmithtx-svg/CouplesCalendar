import type {
  AuthClient,
  AuthCredentials,
  AuthEvent,
  AuthResult,
  AuthSession,
  InitialSessionResult,
} from './authTypes';

type SupabaseError = {
  message: string;
};

type SupabaseSession = {
  expires_at?: number | null;
  user: {
    email?: string | null;
    id: string;
  };
};

type SupabaseAuthLike = {
  auth: {
    getSession: () => Promise<{
      data: { session: SupabaseSession | null };
      error: SupabaseError | null;
    }>;
    onAuthStateChange: (callback: (event: string, session: SupabaseSession | null) => void) => {
      data: {
        subscription: {
          unsubscribe: () => void;
        };
      };
    };
    resetPasswordForEmail: (
      email: string,
      options?: { redirectTo: string },
    ) => Promise<{ error: SupabaseError | null }>;
    signInWithPassword: (credentials: AuthCredentials) => Promise<{
      data: { session: SupabaseSession };
      error: SupabaseError | null;
    }>;
    signOut: () => Promise<{ error: SupabaseError | null }>;
    signUp: (credentials: {
      email: string;
      options?: { emailRedirectTo: string };
      password: string;
    }) => Promise<{
      data: { session: SupabaseSession | null };
      error: SupabaseError | null;
    }>;
  };
};

function throwSupabaseError(error: SupabaseError): never {
  throw new Error(error.message);
}

function mapSession(session: SupabaseSession): AuthSession {
  return {
    expiresAt: session.expires_at ?? null,
    user: {
      email: session.user.email ?? null,
      id: session.user.id,
    },
  };
}

function isExpired(session: SupabaseSession) {
  if (!session.expires_at) {
    return false;
  }

  return session.expires_at <= Math.floor(Date.now() / 1000);
}

function getEmailRedirectTo() {
  if (typeof window === 'undefined') {
    return undefined;
  }

  return window.location.origin;
}

function toAuthEvent(event: string): AuthEvent {
  return event as AuthEvent;
}

export function createSupabaseAuthClient(client: unknown): AuthClient {
  const supabase = client as SupabaseAuthLike;

  return {
    async getInitialSession(): Promise<InitialSessionResult> {
      const { data, error } = await supabase.auth.getSession();

      if (error) {
        return {
          message: error.message,
          status: 'invalid',
        };
      }

      if (!data.session) {
        return {
          status: 'none',
        };
      }

      if (isExpired(data.session)) {
        return {
          status: 'expired',
        };
      }

      return {
        session: mapSession(data.session),
        status: 'session',
      };
    },

    onAuthStateChange(callback) {
      const { data } = supabase.auth.onAuthStateChange((event, session) => {
        callback(toAuthEvent(event), session ? mapSession(session) : null);
      });

      return {
        unsubscribe: () => {
          data.subscription.unsubscribe();
        },
      };
    },

    async resetPassword(email: string) {
      const emailRedirectTo = getEmailRedirectTo();
      const { error } = await supabase.auth.resetPasswordForEmail(
        email,
        emailRedirectTo ? { redirectTo: emailRedirectTo } : undefined,
      );

      if (error) {
        throwSupabaseError(error);
      }
    },

    async signIn({ email, password }: AuthCredentials): Promise<AuthResult> {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throwSupabaseError(error);
      }

      return {
        session: mapSession(data.session),
        status: 'session',
      };
    },

    async signOut() {
      const { error } = await supabase.auth.signOut();

      if (error) {
        throwSupabaseError(error);
      }
    },

    async signUp({ email, password }: AuthCredentials): Promise<AuthResult> {
      const emailRedirectTo = getEmailRedirectTo();
      const { data, error } = await supabase.auth.signUp(
        emailRedirectTo
          ? {
              email,
              options: { emailRedirectTo },
              password,
            }
          : {
              email,
              password,
            },
      );

      if (error) {
        throwSupabaseError(error);
      }

      if (!data.session) {
        return {
          status: 'confirmation-required',
        };
      }

      return {
        session: mapSession(data.session),
        status: 'session',
      };
    },
  };
}
