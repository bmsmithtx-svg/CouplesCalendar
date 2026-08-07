import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type SetStateAction,
} from 'react';

import { getSupabaseClientStatus } from '../../lib/supabase/client';
import { createSupabaseProfileRepository } from '../profiles/profileService';
import type { ProfileInput, ProfileRepository } from '../profiles/profileTypes';
import { validateProfileInput } from '../profiles/profileValidation';
import { AuthContext, type AuthContextValue } from './AuthContext';
import { getSafeAuthErrorMessage, getSafeProfileErrorMessage } from './authErrors';
import { createSupabaseAuthClient } from './authService';
import type {
  AuthClient,
  AuthCredentials,
  AuthSession,
  AuthState,
  InitialSessionResult,
} from './authTypes';

type AuthRuntime =
  | {
      authClient: AuthClient;
      profileRepository: ProfileRepository;
      status: 'ready';
    }
  | {
      message: string;
      missing: string[];
      status: 'missing';
    };

function buildRuntime(
  authClient: AuthClient | undefined,
  profileRepository: ProfileRepository | undefined,
): AuthRuntime {
  if (authClient && profileRepository) {
    return {
      authClient,
      profileRepository,
      status: 'ready',
    };
  }

  const clientStatus = getSupabaseClientStatus();

  if (clientStatus.status === 'missing') {
    return {
      message: clientStatus.message,
      missing: clientStatus.missing,
      status: 'missing',
    };
  }

  return {
    authClient: authClient ?? createSupabaseAuthClient(clientStatus.client),
    profileRepository: profileRepository ?? createSupabaseProfileRepository(clientStatus.client),
    status: 'ready',
  };
}

function getSignedOutState(
  updates: Partial<Extract<AuthState, { status: 'unauthenticated' }>> = {},
): AuthState {
  return {
    operation: 'idle',
    status: 'unauthenticated',
    ...updates,
  };
}

export function AuthProvider({
  authClient,
  children,
  profileRepository,
}: {
  authClient?: AuthClient | undefined;
  children: ReactNode;
  profileRepository?: ProfileRepository | undefined;
}) {
  const runtime = useMemo(
    () => buildRuntime(authClient, profileRepository),
    [authClient, profileRepository],
  );
  const [state, setState] = useState<AuthState>({ status: 'checking-session' });
  const isMountedRef = useRef(false);
  const lastRequestedSignOutAt = useRef<number | null>(null);

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const isProviderMounted = useCallback(() => isMountedRef.current, []);

  const setAuthState = useCallback((nextState: SetStateAction<AuthState>) => {
    if (isMountedRef.current) {
      setState(nextState);
    }
  }, []);

  const loadProfile = useCallback(
    async (session: AuthSession, notice?: string) => {
      if (runtime.status !== 'ready' || !isProviderMounted()) {
        return;
      }

      setAuthState({
        session,
        status: 'profile-loading',
      });

      try {
        const profile = await runtime.profileRepository.getOwnProfile(session.user.id);

        if (!isProviderMounted()) {
          return;
        }

        if (!profile) {
          setAuthState({
            operation: 'idle',
            session,
            status: 'profile-required',
          });
          return;
        }

        setAuthState({
          notice,
          operation: 'idle',
          profile,
          session,
          status: 'authenticated',
        });
      } catch (error) {
        setAuthState({
          message: getSafeProfileErrorMessage(error),
          session,
          status: 'profile-error',
        });
      }
    },
    [isProviderMounted, runtime, setAuthState],
  );

  const retryInitialSession = useCallback(async () => {
    if (runtime.status === 'missing') {
      setAuthState({
        message: runtime.message,
        missing: runtime.missing,
        status: 'configuration-error',
      });
      return;
    }

    setAuthState({
      status: 'checking-session',
    });

    let result: InitialSessionResult;

    try {
      result = await runtime.authClient.getInitialSession();
    } catch (error) {
      setAuthState(
        getSignedOutState({
          error: getSafeAuthErrorMessage(error),
        }),
      );
      return;
    }

    if (!isProviderMounted()) {
      return;
    }

    if (result.status === 'none') {
      setAuthState(getSignedOutState());
      return;
    }

    if (result.status === 'expired') {
      setAuthState({
        message: 'Your session has expired. Sign in again to continue.',
        status: 'session-invalid',
      });
      return;
    }

    if (result.status === 'invalid') {
      setAuthState({
        message: getSafeAuthErrorMessage(new Error(result.message)),
        status: 'session-invalid',
      });
      return;
    }

    await loadProfile(result.session);
  }, [isProviderMounted, loadProfile, runtime, setAuthState]);

  const retryProfile = useCallback(async () => {
    if (
      state.status !== 'authenticated' &&
      state.status !== 'profile-error' &&
      state.status !== 'profile-required'
    ) {
      return;
    }

    await loadProfile(state.session);
  }, [loadProfile, state]);

  useEffect(() => {
    let isActive = true;
    const subscription =
      runtime.status === 'ready'
        ? runtime.authClient.onAuthStateChange((event, session) => {
            if (!isActive || event === 'INITIAL_SESSION') {
              return;
            }

            if (event === 'SIGNED_OUT') {
              const signOutWasRequested =
                lastRequestedSignOutAt.current !== null &&
                Date.now() - lastRequestedSignOutAt.current < 5000;

              setAuthState(
                signOutWasRequested
                  ? getSignedOutState({ notice: 'You have signed out.' })
                  : {
                      message: 'Your session ended. Sign in again to continue.',
                      status: 'session-invalid',
                    },
              );
              lastRequestedSignOutAt.current = null;
              return;
            }

            if (session) {
              void loadProfile(session);
            }
          })
        : undefined;

    void retryInitialSession();

    return () => {
      isActive = false;
      subscription?.unsubscribe();
    };
  }, [loadProfile, retryInitialSession, runtime, setAuthState]);

  const signIn = useCallback(
    async (credentials: AuthCredentials) => {
      if (runtime.status !== 'ready') {
        return;
      }

      setAuthState(getSignedOutState({ operation: 'signing-in' }));

      try {
        const result = await runtime.authClient.signIn(credentials);

        if (!isProviderMounted()) {
          return;
        }

        if (result.status === 'confirmation-required') {
          setAuthState(
            getSignedOutState({
              notice: 'Check your email to finish signing in.',
            }),
          );
          return;
        }

        await loadProfile(result.session);
      } catch (error) {
        setAuthState(
          getSignedOutState({
            error: getSafeAuthErrorMessage(error),
          }),
        );
      }
    },
    [isProviderMounted, loadProfile, runtime, setAuthState],
  );

  const signUp = useCallback(
    async (credentials: AuthCredentials) => {
      if (runtime.status !== 'ready') {
        return;
      }

      setAuthState(getSignedOutState({ operation: 'signing-up' }));

      try {
        const result = await runtime.authClient.signUp(credentials);

        if (!isProviderMounted()) {
          return;
        }

        if (result.status === 'confirmation-required') {
          setAuthState(
            getSignedOutState({
              notice: 'Check your email to confirm the account, then sign in.',
            }),
          );
          return;
        }

        await loadProfile(result.session, 'Account created. Complete your profile to continue.');
      } catch (error) {
        setAuthState(
          getSignedOutState({
            error: getSafeAuthErrorMessage(error),
          }),
        );
      }
    },
    [isProviderMounted, loadProfile, runtime, setAuthState],
  );

  const resetPassword = useCallback(
    async (email: string) => {
      if (runtime.status !== 'ready') {
        return;
      }

      setAuthState(getSignedOutState({ operation: 'sending-reset' }));

      try {
        await runtime.authClient.resetPassword(email);

        if (!isProviderMounted()) {
          return;
        }

        setAuthState(
          getSignedOutState({
            notice: 'If an account exists for that email, a password reset link has been sent.',
          }),
        );
      } catch (error) {
        setAuthState(
          getSignedOutState({
            error: getSafeAuthErrorMessage(error),
          }),
        );
      }
    },
    [isProviderMounted, runtime, setAuthState],
  );

  const saveProfile = useCallback(
    async (input: ProfileInput) => {
      if (runtime.status !== 'ready') {
        return;
      }

      const validation = validateProfileInput(input);

      if (!validation.ok) {
        return;
      }

      setAuthState((current) => {
        if (current.status === 'authenticated') {
          return {
            ...current,
            error: undefined,
            notice: undefined,
            operation: 'saving-profile',
          };
        }

        if (current.status === 'profile-required') {
          return {
            ...current,
            error: undefined,
            operation: 'saving-profile',
          };
        }

        return current;
      });

      try {
        const currentState = state;

        if (currentState.status !== 'authenticated' && currentState.status !== 'profile-required') {
          return;
        }

        const profile = await runtime.profileRepository.saveOwnProfile(
          currentState.session.user.id,
          validation.values,
        );

        if (!isProviderMounted()) {
          return;
        }

        setAuthState({
          notice: 'Profile saved.',
          operation: 'idle',
          profile,
          session: currentState.session,
          status: 'authenticated',
        });
      } catch (error) {
        setAuthState((current) => {
          if (current.status === 'authenticated') {
            return {
              ...current,
              error: getSafeProfileErrorMessage(error),
              operation: 'idle',
            };
          }

          if (current.status === 'profile-required') {
            return {
              ...current,
              error: getSafeProfileErrorMessage(error),
              operation: 'idle',
            };
          }

          return current;
        });
      }
    },
    [isProviderMounted, runtime, setAuthState, state],
  );

  const signOut = useCallback(async () => {
    if (runtime.status !== 'ready') {
      return;
    }

    if (
      state.status !== 'authenticated' &&
      state.status !== 'profile-error' &&
      state.status !== 'profile-required'
    ) {
      return;
    }

    lastRequestedSignOutAt.current = Date.now();
    setAuthState((current) => {
      if (current.status === 'authenticated') {
        return {
          ...current,
          error: undefined,
          operation: 'signing-out',
        };
      }

      if (current.status === 'profile-required') {
        return {
          ...current,
          error: undefined,
        };
      }

      return current;
    });

    try {
      await runtime.authClient.signOut();

      if (!isProviderMounted()) {
        return;
      }

      setAuthState(getSignedOutState({ notice: 'You have signed out.' }));
    } catch (error) {
      lastRequestedSignOutAt.current = null;
      setAuthState((current) => {
        if (current.status === 'authenticated') {
          return {
            ...current,
            error: getSafeAuthErrorMessage(error),
            operation: 'idle',
          };
        }

        if (current.status === 'profile-required') {
          return {
            ...current,
            error: getSafeAuthErrorMessage(error),
          };
        }

        if (current.status === 'profile-error') {
          return {
            ...current,
            message: getSafeAuthErrorMessage(error),
          };
        }

        return current;
      });
    }
  }, [isProviderMounted, runtime, setAuthState, state]);

  const value = useMemo<AuthContextValue>(
    () => ({
      resetPassword,
      retryInitialSession,
      retryProfile,
      saveProfile,
      signIn,
      signOut,
      signUp,
      state,
    }),
    [resetPassword, retryInitialSession, retryProfile, saveProfile, signIn, signOut, signUp, state],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
