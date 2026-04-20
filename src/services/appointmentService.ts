import { apiGet, apiPatch, apiPost } from '../lib/http';
import type {
  Appointment,
  AppointmentPatientDraft,
  AppointmentType,
} from '../types';

export interface NewAppointmentRequest {
  /** Either an existing patient id OR a draft block must be provided. */
  patientId?: string;
  patientName: string;
  patientDraft?: AppointmentPatientDraft;
  start: string; // ISO
  end: string; // ISO
  type: AppointmentType;
  chamberId: string;
  note?: string;
  /** Captured presenting complaint / symptoms — auto-fills chiefComplaint. */
  reason?: string;
  procedure?: string;
  hospital?: string;
}

export interface PromoteDraftResponse {
  appointment: Appointment;
  /** The freshly-created patient record from the draft. */
  patient: import('../types').Patient;
}

export const appointmentService = {
  list: (params?: { from?: string; to?: string }) =>
    apiGet<Appointment[]>('/appointments', { params }),
  create: (body: NewAppointmentRequest) =>
    apiPost<Appointment, NewAppointmentRequest>('/appointments', body),
  /** Promote a draft-patient appointment to a real Patient + link it up. */
  promoteDraft: (id: string) =>
    apiPost<PromoteDraftResponse, Record<string, never>>(
      `/appointments/${id}/promote`,
      {}
    ),
  /** Generic patch — used by draft promotion and surgery/plan edits. */
  update: (id: string, body: Partial<Appointment>) =>
    apiPatch<Appointment, Partial<Appointment>>(`/appointments/${id}`, body),
  /** Mark the doctor's presence in the call room. Either side joining
   *  opens the meeting; when both are absent the room closes. */
  setPresence: (id: string, body: { actor: 'doctor' | 'patient'; present: boolean }) =>
    apiPost<Appointment, { actor: 'doctor' | 'patient'; present: boolean }>(
      `/appointments/${id}/presence`,
      body
    ),
};
