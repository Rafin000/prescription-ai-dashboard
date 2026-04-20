import { apiGet, apiPatch, apiPost } from '../lib/http';
import type { Prescription, RxMedicine, Visit } from '../types';

export interface NewVisitRequest {
  patientId: string;
  patientName: string;
  /** Maps onto Visit.type — call sessions are 'tele'. */
  type: 'consultation' | 'follow-up' | 'tele';
  /** ISO start of the consult/call. */
  startedAt: string;
  /** Length in seconds — formatted into "12 min" by the server. */
  durationSec: number;
  /** What to do with the prescription draft. */
  rxStatus: 'final' | 'draft' | 'none';
  /** Whether the doctor printed this Rx (only meaningful when final). */
  printed?: boolean;
  /** Captured Rx draft — required unless rxStatus is 'none'. */
  draft?: {
    chiefComplaint: string;
    diagnoses: string[];
    tests: string[];
    advice: string[];
    medicines: RxMedicine[];
    followUp?: string;
    notes?: string;
    /** Free-form surgical plan written on the Rx; backend creates or updates
     *  patient.surgicalPlan when present on a finalised visit. */
    operation?: string;
  };
}

export interface FinalizeDraftRequest {
  /** Updated Rx body — overwrites whatever was on the draft. */
  draft: NewVisitRequest['draft'];
  printed?: boolean;
}

export interface UpdateVisitDraftRequest {
  /** Replacement Rx body — visit stays in draft status. */
  draft: NewVisitRequest['draft'];
}

export interface VisitWithRx {
  visit: Visit;
  prescription?: Prescription;
}

export const visitService = {
  /** All visits across every patient — used by the /consultations history page. */
  listAll: () => apiGet<Visit[]>('/visits'),
  /** Persist a finished consult/call session as a Visit (+ optional Rx). */
  create: (body: NewVisitRequest) => apiPost<VisitWithRx, NewVisitRequest>('/visits', body),
  /** Promote a saved draft Rx on a visit to a finalised one. */
  finalizeDraft: (visitId: string, body: FinalizeDraftRequest) =>
    apiPost<VisitWithRx, FinalizeDraftRequest>(`/visits/${visitId}/finalize`, body),
  /** Save edits to a draft Rx without finalising it. */
  updateDraft: (visitId: string, body: UpdateVisitDraftRequest) =>
    apiPatch<VisitWithRx, UpdateVisitDraftRequest>(`/visits/${visitId}/draft`, body),
};
