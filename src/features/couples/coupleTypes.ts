export type CoupleSummary = {
  createdAt: string;
  createdBy: string;
  id: string;
  name: string;
  updatedAt: string;
};

export type CoupleMember = {
  activeMemberSlot: 1 | 2;
  displayName: string | null;
  id: string;
  joinedAt: string;
  userId: string;
};

export type CouplePendingInvitation = {
  createdAt: string;
  createdBy: string;
  expiresAt: string;
  id: string;
};

export type CoupleRelationship =
  | {
      kind: 'not_coupled';
    }
  | {
      canInvite: boolean;
      couple: CoupleSummary;
      kind: 'solo';
      members: CoupleMember[];
      pendingInvitation: CouplePendingInvitation | null;
    }
  | {
      canInvite: true;
      couple: CoupleSummary;
      invitation: CouplePendingInvitation;
      kind: 'pending_outgoing';
      members: CoupleMember[];
    }
  | {
      couple: CoupleSummary;
      kind: 'established';
      members: CoupleMember[];
    };

export type IncomingInvitationStatus =
  | 'already_coupled'
  | 'already_used'
  | 'couple_full'
  | 'declined'
  | 'expired'
  | 'invalid'
  | 'pending'
  | 'profile_required'
  | 'revoked';

export type IncomingInvitation =
  | {
      expiresAt: string | null;
      status: Exclude<IncomingInvitationStatus, 'declined' | 'pending'>;
      token: string;
    }
  | {
      expiresAt: string;
      status: 'pending';
      token: string;
    }
  | {
      expiresAt: null;
      status: 'declined';
      token: null;
    };

export type CreatedInvitation = {
  coupleId: string;
  createdAt: string;
  expiresAt: string;
  id: string;
  token: string;
};

export type GeneratedInvitationLink = CreatedInvitation & {
  link: string;
};

export type AcceptInvitationResult = {
  coupleId: string | null;
  invitationId: string | null;
  status:
    | 'accepted'
    | 'already_coupled'
    | 'already_used'
    | 'couple_full'
    | 'expired'
    | 'invalid'
    | 'not_authenticated'
    | 'profile_required'
    | 'revoked';
};

export type CoupleOperation =
  | 'accepting-invitation'
  | 'creating-couple'
  | 'creating-invitation'
  | 'deleting-couple'
  | 'idle'
  | 'leaving-couple'
  | 'revoking-invitation';

export type CoupleState =
  | {
      status: 'loading';
    }
  | {
      message: string;
      status: 'error';
    }
  | {
      error?: string | undefined;
      generatedInvitation?: GeneratedInvitationLink | undefined;
      incomingInvitation: IncomingInvitation | null;
      notice?: string | undefined;
      operation: CoupleOperation;
      relationship: CoupleRelationship;
      status: 'ready';
    };

export type CoupleRepository = {
  acceptInvitation: (token: string) => Promise<AcceptInvitationResult>;
  createCouple: (name: string) => Promise<void>;
  createInvitation: () => Promise<CreatedInvitation>;
  deleteCouple: (coupleId: string) => Promise<void>;
  getRelationshipState: (userId: string) => Promise<CoupleRelationship>;
  inspectInvitation: (token: string) => Promise<IncomingInvitation>;
  leaveCouple: (coupleId: string) => Promise<void>;
  revokeInvitation: (invitationId: string) => Promise<void>;
};
