import { apiDelete, apiGet, apiPatch, apiPost } from '../lib/http';
import type { TeamRole } from '../lib/permissions';
import type { Invite, PublicInvite, Team, TeamMember } from '../types';

export interface InviteRequest {
  email: string;
  role: TeamRole;
  message?: string;
}

export interface AcceptInviteRequest {
  token: string;
  name: string;
  password: string;
  phone?: string;
}

export const teamService = {
  /* ── team ──────────────────────────────────────────────────── */
  getCurrent: () => apiGet<Team>('/team'),

  /* ── members (authed) ──────────────────────────────────────── */
  listMembers: () => apiGet<TeamMember[]>('/team/members'),

  updateMemberRole: (userId: string, role: TeamRole) =>
    apiPatch<TeamMember, { role: TeamRole }>(`/team/members/${userId}`, { role }),

  removeMember: (userId: string) => apiDelete<void>(`/team/members/${userId}`),

  /* ── invites (authed) ──────────────────────────────────────── */
  listInvites: () => apiGet<Invite[]>('/team/invites'),

  invite: (body: InviteRequest) => apiPost<Invite, InviteRequest>('/team/invites', body),

  revokeInvite: (inviteId: string) => apiDelete<void>(`/team/invites/${inviteId}`),

  resendInvite: (inviteId: string) =>
    apiPost<Invite, Record<string, never>>(`/team/invites/${inviteId}/resend`, {}),

  /* ── invites (public — used by the guest acceptance page) ──── */
  getPublicInvite: (token: string) => apiGet<PublicInvite>(`/invites/${token}`),

  accept: (body: AcceptInviteRequest) =>
    apiPost<{ ok: true }, AcceptInviteRequest>(`/invites/${body.token}/accept`, body),
};
