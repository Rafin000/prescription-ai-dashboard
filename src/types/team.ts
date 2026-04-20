import type { TeamRole } from '../lib/permissions';

export interface Team {
  id: string;
  name: string;
  /** Doctor who owns the clinic workspace; always has role 'admin'. */
  ownerId: string;
  createdAt: string;
}

export type MemberStatus = 'active' | 'suspended';

export interface TeamMember {
  id: string;
  teamId: string;
  userId: string;
  name: string;
  email: string;
  phone?: string;
  avatarUrl?: string;
  role: TeamRole;
  status: MemberStatus;
  joinedAt: string;
  /** True for the workspace owner — can never be removed or demoted. */
  isOwner: boolean;
}

export type InviteStatus = 'pending' | 'accepted' | 'expired' | 'revoked';

export interface Invite {
  id: string;
  teamId: string;
  email: string;
  role: TeamRole;
  status: InviteStatus;
  invitedBy: string;
  invitedByName?: string;
  token: string;
  createdAt: string;
  expiresAt: string;
  acceptedAt?: string;
}

/** Safe shape returned by the public GET /invites/:token endpoint. */
export interface PublicInvite {
  token: string;
  email: string;
  role: TeamRole;
  team: { name: string };
  invitedBy: { name: string };
  expiresAt: string;
  status: InviteStatus;
}
