import { useState, type SyntheticEvent } from 'react';

import { Surface } from '../../components/layout/Surface';
import { Button } from '../../components/ui/Button';
import { Dialog } from '../../components/ui/Dialog';
import { TextField } from '../../components/ui/Fields';
import { EmptyState, LoadingIndicator, SkeletonStack } from '../../components/ui/LoadingStates';
import { StatusBanner } from '../../components/ui/StatusBanner';
import { useAuth } from '../auth/AuthContext';
import { useCouple } from './CoupleContext';
import type {
  CoupleMember,
  CoupleOperation,
  CoupleRelationship,
  GeneratedInvitationLink,
  IncomingInvitation,
} from './coupleTypes';
import { validateCoupleInput } from './coupleValidation';

function formatDateTime(value: string | null) {
  if (!value) {
    return 'Unavailable';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function getInvitationStatusCopy(invitation: IncomingInvitation) {
  switch (invitation.status) {
    case 'already_coupled':
      return {
        body: 'This account already belongs to a couple.',
        title: 'Already coupled',
        tone: 'warning' as const,
      };
    case 'already_used':
      return {
        body: 'This invitation link has already been used.',
        title: 'Invitation already used',
        tone: 'warning' as const,
      };
    case 'couple_full':
      return {
        body: 'That couple already has two members.',
        title: 'Couple full',
        tone: 'warning' as const,
      };
    case 'declined':
      return {
        body: 'The invitation was declined on this device.',
        title: 'Invitation declined',
        tone: 'info' as const,
      };
    case 'expired':
      return {
        body: 'This invitation link has expired. Ask your partner for a new link.',
        title: 'Invitation expired',
        tone: 'warning' as const,
      };
    case 'profile_required':
      return {
        body: 'Complete your profile before accepting an invitation.',
        title: 'Profile required',
        tone: 'warning' as const,
      };
    case 'revoked':
      return {
        body: 'This invitation link was revoked.',
        title: 'Invitation revoked',
        tone: 'warning' as const,
      };
    case 'pending':
      return {
        body: `This link is available until ${formatDateTime(invitation.expiresAt)}.`,
        title: 'Couple invitation received',
        tone: 'info' as const,
      };
    case 'invalid':
    default:
      return {
        body: 'This invitation link cannot be used.',
        title: 'Invitation unavailable',
        tone: 'error' as const,
      };
  }
}

function CreateCoupleForm({
  isSaving,
  onCreate,
}: {
  isSaving: boolean;
  onCreate: (input: { name: string }) => Promise<void>;
}) {
  const { state: authState } = useAuth();
  const [name, setName] = useState(
    authState.status === 'authenticated' ? `${authState.profile.displayName}'s couple` : '',
  );
  const [fieldError, setFieldError] = useState<string | undefined>();

  function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    const validation = validateCoupleInput({ name });

    if (!validation.ok) {
      setFieldError(validation.errors.name);
      return;
    }

    setFieldError(undefined);
    void onCreate(validation.values);
  }

  return (
    <form className="cc-couple-form" aria-label="Create couple form" onSubmit={handleSubmit}>
      <TextField
        error={fieldError}
        label="Couple name"
        maxLength={80}
        onChange={(event) => {
          setName(event.target.value);
        }}
        required
        value={name}
      />
      <Button isLoading={isSaving} type="submit" variant="primary">
        Create couple workspace
      </Button>
    </form>
  );
}

function IncomingInvitationPanel({
  invitation,
  isAccepting,
  onAccept,
  onDecline,
}: {
  invitation: IncomingInvitation;
  isAccepting: boolean;
  onAccept: () => Promise<void>;
  onDecline: () => void;
}) {
  const copy = getInvitationStatusCopy(invitation);

  return (
    <StatusBanner
      action={
        invitation.status === 'pending' ? (
          <div className="cc-couple-actions">
            <Button
              isLoading={isAccepting}
              onClick={() => {
                void onAccept();
              }}
              variant="primary"
            >
              Accept invitation
            </Button>
            <Button onClick={onDecline} variant="ghost">
              Decline
            </Button>
          </div>
        ) : undefined
      }
      title={copy.title}
      tone={copy.tone}
    >
      <p>{copy.body}</p>
    </StatusBanner>
  );
}

function MemberSlots({ members }: { members: CoupleMember[] }) {
  return (
    <div className="cc-member-slots" aria-label="Couple membership slots">
      {[1, 2].map((slot) => {
        const member = members.find((candidate) => candidate.activeMemberSlot === slot);

        return (
          <div className="cc-member-slot" key={slot}>
            <p className="cc-member-slot__label">Slot {slot}</p>
            <p className="cc-member-slot__name">
              {member?.displayName ?? (member ? 'Couple member' : 'Waiting for partner')}
            </p>
            <p className="cc-member-slot__meta">
              {member ? `Joined ${formatDateTime(member.joinedAt)}` : 'Open invitation slot'}
            </p>
          </div>
        );
      })}
    </div>
  );
}

function InvitationLinkPanel({
  generatedInvitation,
  invitation,
}: {
  generatedInvitation?: GeneratedInvitationLink | undefined;
  invitation: { expiresAt: string; id: string } | null;
}) {
  const [copyStatus, setCopyStatus] = useState<'copied' | 'failed' | 'idle'>('idle');

  if (!invitation) {
    return null;
  }

  async function copyLink() {
    if (!generatedInvitation) {
      return;
    }

    try {
      await navigator.clipboard.writeText(generatedInvitation.link);
      setCopyStatus('copied');
    } catch {
      setCopyStatus('failed');
    }
  }

  return (
    <div className="cc-invitation-link">
      <StatusBanner title="Invitation pending" tone="info">
        <p>Partner access is pending until the invitation is accepted.</p>
        <p>Expires {formatDateTime(invitation.expiresAt)}.</p>
      </StatusBanner>

      {generatedInvitation?.id === invitation.id ? (
        <div className="cc-invitation-link__copy">
          <TextField label="Invitation link" readOnly value={generatedInvitation.link} />
          <Button
            onClick={() => {
              void copyLink();
            }}
            variant="secondary"
          >
            Copy link
          </Button>
          {copyStatus === 'copied' ? (
            <p className="cc-inline-note">Invitation link copied.</p>
          ) : null}
          {copyStatus === 'failed' ? (
            <p className="cc-inline-note">Select the link field and copy it manually.</p>
          ) : null}
        </div>
      ) : (
        <StatusBanner title="Link hidden" tone="warning">
          <p>Create a new invitation if the original link was not saved.</p>
        </StatusBanner>
      )}
    </div>
  );
}

function CoupleInvitationManager({
  generatedInvitation,
  isCreatingInvitation,
  isRevokingInvitation,
  relationship,
  revokeInvitation,
  createInvitation,
}: {
  createInvitation: () => Promise<void>;
  generatedInvitation?: GeneratedInvitationLink | undefined;
  isCreatingInvitation: boolean;
  isRevokingInvitation: boolean;
  relationship: Extract<CoupleRelationship, { kind: 'pending_outgoing' | 'solo' }>;
  revokeInvitation: (invitationId: string) => Promise<void>;
}) {
  const invitation =
    relationship.kind === 'pending_outgoing'
      ? relationship.invitation
      : relationship.pendingInvitation;

  return (
    <div className="cc-couple-stack">
      <MemberSlots members={relationship.members} />

      <InvitationLinkPanel generatedInvitation={generatedInvitation} invitation={invitation} />

      {relationship.canInvite ? (
        <div className="cc-couple-actions">
          <Button
            isLoading={isCreatingInvitation}
            onClick={() => {
              void createInvitation();
            }}
            variant="primary"
          >
            {invitation ? 'Create new invitation link' : 'Create invitation link'}
          </Button>
          {invitation ? (
            <Button
              isLoading={isRevokingInvitation}
              onClick={() => {
                void revokeInvitation(invitation.id);
              }}
              variant="destructive"
            >
              Revoke invitation
            </Button>
          ) : null}
        </div>
      ) : (
        <StatusBanner title="Invitation unavailable" tone="warning">
          <p>
            This couple already had two membership slots assigned. Delete the couple to start over.
          </p>
        </StatusBanner>
      )}
    </div>
  );
}

function RelationshipReadyBody() {
  const {
    acceptInvitation,
    createCouple,
    createInvitation,
    declineInvitation,
    refreshRelationship,
    revokeInvitation,
    state,
  } = useCouple();

  if (state.status === 'loading') {
    return (
      <div className="cc-couple-stack">
        <LoadingIndicator label="Loading couple state" />
        <SkeletonStack count={3} label="Couple state loading placeholder" />
      </div>
    );
  }

  if (state.status === 'error') {
    return (
      <StatusBanner
        action={
          <Button
            onClick={() => {
              void refreshRelationship();
            }}
            variant="secondary"
          >
            Retry
          </Button>
        }
        title="Couple state unavailable"
        tone="error"
      >
        <p>{state.message}</p>
      </StatusBanner>
    );
  }

  const { relationship } = state;

  return (
    <div className="cc-couple-stack">
      {state.notice ? (
        <StatusBanner title="Couple updated" tone="success">
          <p>{state.notice}</p>
        </StatusBanner>
      ) : null}

      {state.error ? (
        <StatusBanner title="Couple action failed" tone="error">
          <p>{state.error}</p>
        </StatusBanner>
      ) : null}

      {state.incomingInvitation ? (
        <IncomingInvitationPanel
          invitation={state.incomingInvitation}
          isAccepting={state.operation === 'accepting-invitation'}
          onAccept={acceptInvitation}
          onDecline={declineInvitation}
        />
      ) : null}

      {relationship.kind === 'not_coupled' ? (
        <div className="cc-couple-stack">
          <EmptyState title="No couple workspace">
            <p>Create a private two-person workspace or accept a valid invitation link.</p>
          </EmptyState>
          <CreateCoupleForm
            isSaving={state.operation === 'creating-couple'}
            onCreate={createCouple}
          />
        </div>
      ) : null}

      {relationship.kind === 'solo' || relationship.kind === 'pending_outgoing' ? (
        <CoupleInvitationManager
          createInvitation={createInvitation}
          generatedInvitation={state.generatedInvitation}
          isCreatingInvitation={state.operation === 'creating-invitation'}
          isRevokingInvitation={state.operation === 'revoking-invitation'}
          relationship={relationship}
          revokeInvitation={revokeInvitation}
        />
      ) : null}

      {relationship.kind === 'established' ? (
        <div className="cc-couple-stack">
          <StatusBanner title="Couple established" tone="success">
            <p>{relationship.couple.name} has two active members.</p>
          </StatusBanner>
          <MemberSlots members={relationship.members} />
          <EmptyState title="Shared calendar not started">
            <p>Calendar viewing begins after the Milestone 4 relationship boundary is reviewed.</p>
          </EmptyState>
        </div>
      ) : null}
    </div>
  );
}

export function CoupleHome() {
  return (
    <Surface
      description="Create the private two-person workspace and manage the partner invitation."
      title="Couple workspace"
    >
      <RelationshipReadyBody />
    </Surface>
  );
}

function getActiveRelationship(relationship: CoupleRelationship) {
  return relationship.kind === 'not_coupled' ? null : relationship;
}

export function CoupleContextSummary() {
  const { state } = useCouple();

  if (state.status === 'loading') {
    return (
      <StatusBanner title="Couple state" tone="info">
        <p>Loading couple membership.</p>
      </StatusBanner>
    );
  }

  if (state.status === 'error') {
    return (
      <StatusBanner title="Couple state" tone="error">
        <p>{state.message}</p>
      </StatusBanner>
    );
  }

  const relationship = getActiveRelationship(state.relationship);

  if (!relationship) {
    return (
      <div className="cc-context-card">
        <p className="cc-context-card__label">Couple workspace</p>
        <p className="cc-context-card__text">No active couple.</p>
      </div>
    );
  }

  return (
    <div className="cc-context-card">
      <p className="cc-context-card__label">Couple workspace</p>
      <p className="cc-context-card__value">{relationship.couple.name}</p>
      <p className="cc-context-card__text">
        {relationship.members.length} of 2 member slots active.
      </p>
    </div>
  );
}

function getSettingsRelationship(
  relationship: CoupleRelationship,
): Exclude<CoupleRelationship, { kind: 'not_coupled' }> | null {
  return relationship.kind === 'not_coupled' ? null : relationship;
}

function isOperation(operation: CoupleOperation, target: CoupleOperation) {
  return operation === target;
}

export function CoupleSettings() {
  const { deleteCouple, leaveCouple, refreshRelationship, state } = useCouple();
  const [dialogAction, setDialogAction] = useState<'delete' | 'leave' | null>(null);

  if (state.status === 'loading') {
    return (
      <div className="cc-couple-stack">
        <LoadingIndicator label="Loading couple settings" />
        <SkeletonStack count={2} />
      </div>
    );
  }

  if (state.status === 'error') {
    return (
      <StatusBanner
        action={
          <Button
            onClick={() => {
              void refreshRelationship();
            }}
            variant="secondary"
          >
            Retry
          </Button>
        }
        title="Couple settings unavailable"
        tone="error"
      >
        <p>{state.message}</p>
      </StatusBanner>
    );
  }

  const relationship = getSettingsRelationship(state.relationship);

  if (!relationship) {
    return (
      <StatusBanner title="Couple" tone="info">
        <p>No active couple workspace is associated with this account.</p>
      </StatusBanner>
    );
  }

  return (
    <div className="cc-settings-stack">
      <StatusBanner title="Couple" tone="success">
        <p>{relationship.couple.name}</p>
      </StatusBanner>
      <MemberSlots members={relationship.members} />
      <div className="cc-account-actions">
        <div>
          <p className="cc-account-actions__title">Membership</p>
          <p className="cc-account-actions__description">
            Leaving removes this account's active access immediately.
          </p>
        </div>
        <Button
          isLoading={isOperation(state.operation, 'leaving-couple')}
          onClick={() => {
            setDialogAction('leave');
          }}
          variant="secondary"
        >
          Leave couple
        </Button>
      </div>
      <div className="cc-account-actions">
        <div>
          <p className="cc-account-actions__title">Delete couple</p>
          <p className="cc-account-actions__description">
            Deleting revokes invitations and removes both active memberships.
          </p>
        </div>
        <Button
          isLoading={isOperation(state.operation, 'deleting-couple')}
          onClick={() => {
            setDialogAction('delete');
          }}
          variant="destructive"
        >
          Delete couple
        </Button>
      </div>
      <Dialog
        destructive={dialogAction === 'delete'}
        footer={
          <>
            <Button
              onClick={() => {
                setDialogAction(null);
              }}
              variant="ghost"
            >
              Cancel
            </Button>
            <Button
              isLoading={
                isOperation(state.operation, 'deleting-couple') ||
                isOperation(state.operation, 'leaving-couple')
              }
              onClick={() => {
                const coupleId = relationship.couple.id;
                const action = dialogAction;
                setDialogAction(null);

                if (action === 'delete') {
                  void deleteCouple(coupleId);
                  return;
                }

                if (action === 'leave') {
                  void leaveCouple(coupleId);
                }
              }}
              variant={dialogAction === 'delete' ? 'destructive' : 'primary'}
            >
              {dialogAction === 'delete' ? 'Delete couple' : 'Leave couple'}
            </Button>
          </>
        }
        onClose={() => {
          setDialogAction(null);
        }}
        open={dialogAction !== null}
        title={dialogAction === 'delete' ? 'Delete couple' : 'Leave couple'}
      >
        <p>
          {dialogAction === 'delete'
            ? 'This removes the active couple boundary for both members.'
            : 'This removes only your active membership.'}
        </p>
      </Dialog>
    </div>
  );
}
