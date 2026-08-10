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
import { useAuth } from '../auth/AuthContext';
import { getSafeCoupleErrorMessage } from './coupleErrors';
import { CoupleContext, type CoupleContextValue } from './CoupleContext';
import { createSupabaseCoupleRepository } from './coupleService';
import type {
  CoupleOperation,
  CoupleRepository,
  CoupleState,
  GeneratedInvitationLink,
  IncomingInvitation,
} from './coupleTypes';
import { validateCoupleInput, type CoupleInput } from './coupleValidation';

type CoupleRuntime =
  | {
      repository: CoupleRepository;
      status: 'ready';
    }
  | {
      message: string;
      status: 'missing';
    };

function buildRuntime(repository: CoupleRepository | undefined): CoupleRuntime {
  if (repository) {
    return {
      repository,
      status: 'ready',
    };
  }

  const clientStatus = getSupabaseClientStatus();

  if (clientStatus.status === 'missing') {
    return {
      message: clientStatus.message,
      status: 'missing',
    };
  }

  return {
    repository: createSupabaseCoupleRepository(clientStatus.client),
    status: 'ready',
  };
}

function getInvitationTokenFromUrl() {
  if (typeof window === 'undefined') {
    return null;
  }

  const token = new URL(window.location.href).searchParams.get('invite')?.trim();

  return token && token.length > 0 ? token : null;
}

function clearInvitationTokenFromUrl() {
  if (typeof window === 'undefined') {
    return;
  }

  const url = new URL(window.location.href);

  if (!url.searchParams.has('invite')) {
    return;
  }

  url.searchParams.delete('invite');
  window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
}

function buildInvitationLink(token: string) {
  if (typeof window === 'undefined') {
    return `?invite=${encodeURIComponent(token)}`;
  }

  const url = new URL(window.location.origin + window.location.pathname);
  url.searchParams.set('invite', token);

  return url.toString();
}

function getAlreadyCoupledInvitation(token: string): IncomingInvitation {
  return {
    expiresAt: null,
    status: 'already_coupled',
    token,
  };
}

function mapRejectedAcceptResult(
  status: Awaited<ReturnType<CoupleRepository['acceptInvitation']>>['status'],
  token: string,
): IncomingInvitation {
  return {
    expiresAt: null,
    status: status === 'accepted' || status === 'not_authenticated' ? 'invalid' : status,
    token,
  };
}

export function CoupleProvider({
  children,
  repository,
}: {
  children: ReactNode;
  repository?: CoupleRepository | undefined;
}) {
  const { state: authState } = useAuth();
  const runtime = useMemo(() => buildRuntime(repository), [repository]);
  const [state, setState] = useState<CoupleState>({ status: 'loading' });
  const isMountedRef = useRef(false);

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const setCoupleState = useCallback((nextState: SetStateAction<CoupleState>) => {
    if (isMountedRef.current) {
      setState(nextState);
    }
  }, []);

  const loadRelationship = useCallback(
    async ({
      generatedInvitation,
      incomingInvitationOverride,
      notice,
    }: {
      generatedInvitation?: GeneratedInvitationLink | undefined;
      incomingInvitationOverride?: IncomingInvitation | null | undefined;
      notice?: string | undefined;
    } = {}) => {
      if (authState.status !== 'authenticated') {
        return;
      }

      if (runtime.status === 'missing') {
        setCoupleState({
          message: runtime.message,
          status: 'error',
        });
        return;
      }

      setCoupleState({ status: 'loading' });

      try {
        const relationship = await runtime.repository.getRelationshipState(
          authState.session.user.id,
        );

        if (!isMountedRef.current) {
          return;
        }

        const token = getInvitationTokenFromUrl();
        let incomingInvitation: IncomingInvitation | null = incomingInvitationOverride ?? null;

        if (incomingInvitationOverride === undefined && token) {
          incomingInvitation =
            relationship.kind === 'not_coupled'
              ? await runtime.repository.inspectInvitation(token)
              : getAlreadyCoupledInvitation(token);
        }

        setCoupleState({
          generatedInvitation,
          incomingInvitation,
          notice,
          operation: 'idle',
          relationship,
          status: 'ready',
        });
      } catch (error) {
        setCoupleState({
          message: getSafeCoupleErrorMessage(error),
          status: 'error',
        });
      }
    },
    [authState, runtime, setCoupleState],
  );

  useEffect(() => {
    void loadRelationship();
  }, [loadRelationship]);

  const setOperation = useCallback(
    (operation: CoupleOperation) => {
      setCoupleState((current) =>
        current.status === 'ready'
          ? {
              ...current,
              error: undefined,
              notice: undefined,
              operation,
            }
          : current,
      );
    },
    [setCoupleState],
  );

  const setReadyError = useCallback(
    (message: string) => {
      setCoupleState((current) =>
        current.status === 'ready'
          ? {
              ...current,
              error: message,
              operation: 'idle',
            }
          : current,
      );
    },
    [setCoupleState],
  );

  const createCouple = useCallback(
    async (input: CoupleInput) => {
      if (runtime.status !== 'ready') {
        return;
      }

      const validation = validateCoupleInput(input);

      if (!validation.ok) {
        setReadyError(validation.errors.name ?? 'Enter a valid couple name.');
        return;
      }

      setOperation('creating-couple');

      try {
        await runtime.repository.createCouple(validation.values.name);
        await loadRelationship({ notice: 'Couple workspace created.' });
      } catch (error) {
        setReadyError(getSafeCoupleErrorMessage(error));
      }
    },
    [loadRelationship, runtime, setOperation, setReadyError],
  );

  const createInvitation = useCallback(async () => {
    if (runtime.status !== 'ready') {
      return;
    }

    setOperation('creating-invitation');

    try {
      const invitation = await runtime.repository.createInvitation();
      const generatedInvitation = {
        ...invitation,
        link: buildInvitationLink(invitation.token),
      };

      await loadRelationship({
        generatedInvitation,
        notice: 'Invitation link created.',
      });
    } catch (error) {
      setReadyError(getSafeCoupleErrorMessage(error));
    }
  }, [loadRelationship, runtime, setOperation, setReadyError]);

  const revokeInvitation = useCallback(
    async (invitationId: string) => {
      if (runtime.status !== 'ready') {
        return;
      }

      setOperation('revoking-invitation');

      try {
        await runtime.repository.revokeInvitation(invitationId);
        await loadRelationship({ notice: 'Invitation revoked.' });
      } catch (error) {
        setReadyError(getSafeCoupleErrorMessage(error));
      }
    },
    [loadRelationship, runtime, setOperation, setReadyError],
  );

  const acceptInvitation = useCallback(async () => {
    if (runtime.status !== 'ready' || state.status !== 'ready') {
      return;
    }

    const incomingInvitation = state.incomingInvitation;

    if (incomingInvitation?.status !== 'pending') {
      setReadyError('Open a valid invitation link before accepting.');
      return;
    }

    setOperation('accepting-invitation');

    try {
      const result = await runtime.repository.acceptInvitation(incomingInvitation.token);

      if (result.status === 'accepted') {
        clearInvitationTokenFromUrl();
        await loadRelationship({ notice: 'Invitation accepted.' });
        return;
      }

      setCoupleState((current) =>
        current.status === 'ready'
          ? {
              ...current,
              incomingInvitation: mapRejectedAcceptResult(result.status, incomingInvitation.token),
              operation: 'idle',
            }
          : current,
      );
    } catch (error) {
      setReadyError(getSafeCoupleErrorMessage(error));
    }
  }, [loadRelationship, runtime, setCoupleState, setOperation, setReadyError, state]);

  const declineInvitation = useCallback(() => {
    clearInvitationTokenFromUrl();
    setCoupleState((current) =>
      current.status === 'ready'
        ? {
            ...current,
            error: undefined,
            incomingInvitation: {
              expiresAt: null,
              status: 'declined',
              token: null,
            },
            notice: undefined,
            operation: 'idle',
          }
        : current,
    );
  }, [setCoupleState]);

  const leaveCouple = useCallback(
    async (coupleId: string) => {
      if (runtime.status !== 'ready') {
        return;
      }

      setOperation('leaving-couple');

      try {
        await runtime.repository.leaveCouple(coupleId);
        await loadRelationship({ notice: 'You left the couple.' });
      } catch (error) {
        setReadyError(getSafeCoupleErrorMessage(error));
      }
    },
    [loadRelationship, runtime, setOperation, setReadyError],
  );

  const deleteCouple = useCallback(
    async (coupleId: string) => {
      if (runtime.status !== 'ready') {
        return;
      }

      setOperation('deleting-couple');

      try {
        await runtime.repository.deleteCouple(coupleId);
        await loadRelationship({ notice: 'Couple deleted.' });
      } catch (error) {
        setReadyError(getSafeCoupleErrorMessage(error));
      }
    },
    [loadRelationship, runtime, setOperation, setReadyError],
  );

  const value = useMemo<CoupleContextValue>(
    () => ({
      acceptInvitation,
      createCouple,
      createInvitation,
      declineInvitation,
      deleteCouple,
      leaveCouple,
      refreshRelationship: loadRelationship,
      revokeInvitation,
      state,
    }),
    [
      acceptInvitation,
      createCouple,
      createInvitation,
      declineInvitation,
      deleteCouple,
      leaveCouple,
      loadRelationship,
      revokeInvitation,
      state,
    ],
  );

  return <CoupleContext.Provider value={value}>{children}</CoupleContext.Provider>;
}
