import { apiGet, apiPost } from '../lib/http';
import type { GuestAppointment } from '../types';

/**
 * Public endpoints used by the guest patient join flow. These are intentionally
 * unauthenticated — the `joinToken` is the capability that grants access.
 * The response only includes the minimum info needed for the join page.
 */
export const guestService = {
  getAppointment: (token: string) =>
    apiGet<GuestAppointment>(`/join/${token}`),

  /** Patient announces they've opened the call. Flips `patientJoined` on the
   *  doctor side so they see "patient is here". Also flips
   *  `patientPresent` for the room; calling again after a disconnect
   *  reopens the meeting. */
  announce: (token: string, displayName: string) =>
    apiPost<{ ok: true }, { displayName: string }>(`/join/${token}/announce`, {
      displayName,
    }),
  /** Patient leaves the room. Complements `announce` so the room can
   *  cleanly empty out and re-open when someone joins again. */
  depart: (token: string) =>
    apiPost<{ ok: true }, Record<string, never>>(`/join/${token}/depart`, {}),
};
