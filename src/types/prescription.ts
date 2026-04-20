import type { LabStatus } from './common';
import type { RxMedicine } from './medicine';

export interface Prescription {
  id: string;
  patientId: string;
  doctorId: string;
  date: string;
  chiefComplaint?: string;
  diagnoses: string[];
  tests: string[];
  advice: string[];
  medicines: RxMedicine[];
  followUp?: string;
  notes?: string;
  /** Free-form surgical plan written on the Rx. On finalise it maps to
   *  the patient's SurgicalPlan and drives the Latest-status card. */
  operation?: string;
  /** Drafts can be re-opened and finalised later; finals are locked. */
  status?: 'draft' | 'final';
  /** ISO timestamp the doctor printed this Rx (set on finalise + print). */
  printedAt?: string;
  /** ID of the visit this Rx came out of (consult or call). */
  visitId?: string;
}

export interface LabTest {
  id: string;
  patientId: string;
  name: string;
  orderedOn: string;
  status: LabStatus;
  summary?: string;
  reportUrl?: string;
}
