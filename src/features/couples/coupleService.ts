import type {
  AcceptInvitationResult,
  CoupleMember,
  CouplePendingInvitation,
  CoupleRelationship,
  CoupleRepository,
  CoupleSummary,
  CreatedInvitation,
  IncomingInvitation,
  IncomingInvitationStatus,
} from './coupleTypes';

type CoupleRow = {
  created_at: string;
  created_by: string;
  id: string;
  name: string;
  updated_at: string;
};

type CoupleMemberRow = {
  active_member_slot: 1 | 2 | null;
  couple_id: string;
  id: string;
  joined_at: string;
  membership_status: 'active' | 'exited' | 'removed';
  user_id: string;
};

type CoupleInvitationRow = {
  accepted_at: string | null;
  accepted_by: string | null;
  couple_id: string;
  created_at: string;
  created_by: string;
  expires_at: string;
  id: string;
  revoked_at: string | null;
  status: 'accepted' | 'pending' | 'revoked';
  updated_at: string;
};

type MembershipWithCouple = CoupleMemberRow & {
  couples: CoupleRow;
};

type ProfileNameRow = {
  display_name: string;
  id: string;
};

type QueryError = {
  message: string;
};

type QueryResponse<T> = {
  data: T;
  error: QueryError | null;
};

type MaybeSingleResponse<T> = {
  data: T | null;
  error: QueryError | null;
};

type QueryBuilder = PromiseLike<QueryResponse<unknown>> & {
  eq: (column: string, value: string) => QueryBuilder;
  in: (column: string, values: string[]) => QueryBuilder;
  limit: (count: number) => QueryBuilder;
  maybeSingle: <T = unknown>() => Promise<MaybeSingleResponse<T>>;
  order: (column: string, options?: { ascending?: boolean }) => QueryBuilder;
  select: (columns: string) => QueryBuilder;
};

type CoupleSupabaseClient = {
  from: (table: string) => QueryBuilder;
  rpc: <T = unknown[]>(name: string, args?: Record<string, unknown>) => Promise<QueryResponse<T>>;
};

async function runQuery<T>(query: QueryBuilder): Promise<QueryResponse<T>> {
  const { data, error } = await query;

  return {
    data: data as T,
    error,
  };
}

function throwQueryError(error: QueryError): never {
  throw new Error(error.message);
}

type AcceptInvitationRow = {
  couple_id: string | null;
  invitation_id: string | null;
  status: string;
};

type CreatedInvitationRow = {
  couple_id: string;
  created_at: string;
  expires_at: string;
  invitation_id: string;
  invitation_token: string;
};

type InspectedInvitationRow = {
  expires_at: string | null;
  status: string;
};

const memberColumns =
  'id, couple_id, user_id, active_member_slot, membership_status, joined_at, left_at, created_at, updated_at';
const invitationColumns =
  'id, couple_id, created_by, status, expires_at, revoked_at, accepted_by, accepted_at, created_at, updated_at';

function mapCouple(row: CoupleRow): CoupleSummary {
  return {
    createdAt: row.created_at,
    createdBy: row.created_by,
    id: row.id,
    name: row.name,
    updatedAt: row.updated_at,
  };
}

function mapInvitation(row: CoupleInvitationRow): CouplePendingInvitation {
  return {
    createdAt: row.created_at,
    createdBy: row.created_by,
    expiresAt: row.expires_at,
    id: row.id,
  };
}

function mapMember(row: CoupleMemberRow, profilesById: Map<string, ProfileNameRow>): CoupleMember {
  return {
    activeMemberSlot: row.active_member_slot ?? 1,
    displayName: profilesById.get(row.user_id)?.display_name ?? null,
    id: row.id,
    joinedAt: row.joined_at,
    userId: row.user_id,
  };
}

function mapInspectionStatus(status: string): Exclude<IncomingInvitationStatus, 'declined'> {
  if (
    status === 'already_coupled' ||
    status === 'already_used' ||
    status === 'couple_full' ||
    status === 'expired' ||
    status === 'invalid' ||
    status === 'pending' ||
    status === 'profile_required' ||
    status === 'revoked'
  ) {
    return status;
  }

  return 'invalid';
}

function mapAcceptStatus(status: string): AcceptInvitationResult['status'] {
  if (
    status === 'accepted' ||
    status === 'already_coupled' ||
    status === 'already_used' ||
    status === 'couple_full' ||
    status === 'expired' ||
    status === 'invalid' ||
    status === 'not_authenticated' ||
    status === 'profile_required' ||
    status === 'revoked'
  ) {
    return status;
  }

  return 'invalid';
}

async function getProfilesById(
  client: unknown,
  userIds: string[],
): Promise<Map<string, ProfileNameRow>> {
  if (userIds.length === 0) {
    return new Map();
  }

  const db = client as CoupleSupabaseClient;
  const { data, error } = await runQuery<ProfileNameRow[]>(
    db.from('profiles').select('id, display_name').in('id', userIds),
  );

  if (error) {
    throwQueryError(error);
  }

  return new Map(data.map((profile) => [profile.id, profile]));
}

export function createSupabaseCoupleRepository(client: unknown): CoupleRepository {
  const db = client as CoupleSupabaseClient;

  return {
    async acceptInvitation(token: string): Promise<AcceptInvitationResult> {
      const { data, error } = await db.rpc<AcceptInvitationRow[]>('accept_couple_invitation', {
        invitation_token: token,
      });

      if (error) {
        throwQueryError(error);
      }

      const result = data[0];

      return {
        coupleId: result?.couple_id ?? null,
        invitationId: result?.invitation_id ?? null,
        status: mapAcceptStatus(result?.status ?? 'invalid'),
      };
    },

    async createCouple(name: string) {
      const { error } = await db.rpc('create_couple', {
        couple_name: name,
      });

      if (error) {
        throwQueryError(error);
      }
    },

    async createInvitation(): Promise<CreatedInvitation> {
      const { data, error } = await db.rpc<CreatedInvitationRow[]>('create_couple_invitation');

      if (error) {
        throwQueryError(error);
      }

      const invitation = data[0];

      if (!invitation) {
        throw new Error('invitation_unavailable');
      }

      return {
        coupleId: invitation.couple_id,
        createdAt: invitation.created_at,
        expiresAt: invitation.expires_at,
        id: invitation.invitation_id,
        token: invitation.invitation_token,
      };
    },

    async deleteCouple(coupleId: string) {
      const { error } = await db.rpc('delete_couple', {
        target_couple_id: coupleId,
      });

      if (error) {
        throwQueryError(error);
      }
    },

    async getRelationshipState(userId: string): Promise<CoupleRelationship> {
      const { data: membershipData, error: membershipError } = await db
        .from('couple_members')
        .select(
          `${memberColumns}, couples!inner(id, name, created_by, status, deleted_at, created_at, updated_at)`,
        )
        .eq('user_id', userId)
        .eq('membership_status', 'active')
        .maybeSingle<MembershipWithCouple>();

      if (membershipError) {
        throwQueryError(membershipError);
      }

      const membership = membershipData;

      if (!membership) {
        return {
          kind: 'not_coupled',
        };
      }

      const couple = mapCouple(membership.couples);
      const { data: memberRows, error: membersError } = await runQuery<CoupleMemberRow[]>(
        db.from('couple_members').select(memberColumns).eq('couple_id', couple.id),
      );

      if (membersError) {
        throwQueryError(membersError);
      }

      const activeMemberRows = memberRows
        .filter((member) => member.membership_status === 'active' && member.active_member_slot)
        .sort((a, b) => (a.active_member_slot ?? 0) - (b.active_member_slot ?? 0));
      const profilesById = await getProfilesById(
        client,
        activeMemberRows.map((member) => member.user_id),
      );
      const members = activeMemberRows.map((member) => mapMember(member, profilesById));

      if (members.length >= 2) {
        return {
          couple,
          kind: 'established',
          members,
        };
      }

      const canInvite = memberRows.length === 1;

      const { data: invitationRows, error: invitationsError } = await runQuery<
        CoupleInvitationRow[]
      >(
        db
          .from('couple_invitations')
          .select(invitationColumns)
          .eq('couple_id', couple.id)
          .eq('status', 'pending')
          .order('created_at', { ascending: false })
          .limit(1),
      );

      if (invitationsError) {
        throwQueryError(invitationsError);
      }

      const pendingInvitation = invitationRows[0] ? mapInvitation(invitationRows[0]) : null;

      if (pendingInvitation && canInvite) {
        return {
          canInvite: true,
          couple,
          invitation: pendingInvitation,
          kind: 'pending_outgoing',
          members,
        };
      }

      return {
        canInvite,
        couple,
        kind: 'solo',
        members,
        pendingInvitation,
      };
    },

    async inspectInvitation(token: string): Promise<IncomingInvitation> {
      const { data, error } = await db.rpc<InspectedInvitationRow[]>('inspect_couple_invitation', {
        invitation_token: token,
      });

      if (error) {
        throwQueryError(error);
      }

      const result = data[0];
      const status = mapInspectionStatus(result?.status ?? 'invalid');

      if (status === 'pending' && result?.expires_at) {
        return {
          expiresAt: result.expires_at,
          status,
          token,
        };
      }

      return {
        expiresAt: result?.expires_at ?? null,
        status: status === 'pending' ? 'invalid' : status,
        token,
      };
    },

    async leaveCouple(coupleId: string) {
      const { error } = await db.rpc('leave_couple', {
        target_couple_id: coupleId,
      });

      if (error) {
        throwQueryError(error);
      }
    },

    async revokeInvitation(invitationId: string) {
      const { error } = await db.rpc('revoke_couple_invitation', {
        invitation_id: invitationId,
      });

      if (error) {
        throwQueryError(error);
      }
    },
  };
}
