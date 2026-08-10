import { createContext, useContext } from 'react';

import type { CoupleInput } from './coupleValidation';
import type { CoupleState } from './coupleTypes';

export type CoupleContextValue = {
  acceptInvitation: () => Promise<void>;
  createCouple: (input: CoupleInput) => Promise<void>;
  createInvitation: () => Promise<void>;
  declineInvitation: () => void;
  deleteCouple: (coupleId: string) => Promise<void>;
  leaveCouple: (coupleId: string) => Promise<void>;
  refreshRelationship: () => Promise<void>;
  revokeInvitation: (invitationId: string) => Promise<void>;
  state: CoupleState;
};

export const CoupleContext = createContext<CoupleContextValue | null>(null);

export function useCouple() {
  const context = useContext(CoupleContext);

  if (!context) {
    throw new Error('useCouple must be used inside CoupleProvider');
  }

  return context;
}
