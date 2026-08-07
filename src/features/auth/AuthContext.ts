import { createContext, useContext } from 'react';

import type { ProfileInput } from '../profiles/profileTypes';
import type { AuthCredentials, AuthState } from './authTypes';

export type AuthContextValue = {
  retryInitialSession: () => Promise<void>;
  retryProfile: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  saveProfile: (input: ProfileInput) => Promise<void>;
  signIn: (credentials: AuthCredentials) => Promise<void>;
  signOut: () => Promise<void>;
  signUp: (credentials: AuthCredentials) => Promise<void>;
  state: AuthState;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }

  return context;
}
