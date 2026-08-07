import type { Session, SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '../../lib/supabase/database.types';
import type {
  AuthClient,
  AuthCredentials,
  AuthResult,
  AuthSession,
  InitialSessionResult,
} from './authTypes';

function mapSession(session: Session): AuthSession {
  return {
    expiresAt: session.expires_at ?? null,
    user: {
      email: session.user.email ?? null,
      id: session.user.id,
    },
  };
}

function isExpired(session: Session) {
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

export function createSupabaseAuthClient(client: SupabaseClient<Database>): AuthClient {
  return {
    async getInitialSession(): Promise<InitialSessionResult> {
      const { data, error } = await client.auth.getSession();

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
      const { data } = client.auth.onAuthStateChange((event, session) => {
        callback(event, session ? mapSession(session) : null);
      });

      return {
        unsubscribe: () => {
          data.subscription.unsubscribe();
        },
      };
    },

    async resetPassword(email: string) {
      const emailRedirectTo = getEmailRedirectTo();
      const { error } = await client.auth.resetPasswordForEmail(
        email,
        emailRedirectTo ? { redirectTo: emailRedirectTo } : undefined,
      );

      if (error) {
        throw error;
      }
    },

    async signIn({ email, password }: AuthCredentials): Promise<AuthResult> {
      const { data, error } = await client.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      return {
        session: mapSession(data.session),
        status: 'session',
      };
    },

    async signOut() {
      const { error } = await client.auth.signOut();

      if (error) {
        throw error;
      }
    },

    async signUp({ email, password }: AuthCredentials): Promise<AuthResult> {
      const emailRedirectTo = getEmailRedirectTo();
      const { data, error } = await client.auth.signUp(
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
        throw error;
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
