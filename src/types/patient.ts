import type { Sex } from './common';
import type { SurgicalPlan } from './surgery';

export interface PatientCondition {
  name: string;
  diagnosedYear: number;
  status?: 'controlled' | 'uncontrolled' | 'suspected';
}

export interface PatientEmergencyContact {
  name: string;
  relation: string;
  phone: string;
}

export interface Patient {
  id: string;
  code: string;
  name: string;
  nameBn?: string;
  age: number;
  sex: Sex;
  phone: string;
  address: string;
  bloodGroup?: string;
  allergies?: string[];
  conditions?: PatientCondition[];
  emergencyContact?: PatientEmergencyContact;
  patientSince: string;
  visits: number;
  avatarUrl?: string;
  /** One active surgical plan at a time; past plans live in a history feed. */
  surgicalPlan?: SurgicalPlan | null;
}

export interface Vital {
  label: string;
  unit: string;
  value: string;
  trend?: number[];
  delta?: string;
  tone?: 'accent' | 'warn' | 'danger' | 'success';
}

export interface Visit {
  id: string;
  patientId: string;
  date: string;
  type: 'consultation' | 'follow-up' | 'tele';
  duration?: string;
  chiefComplaint: string;
  diagnoses: string[];
  prescriptionId?: string;
  /**
   * What happened with the prescription at the end of this consult/call.
   * - `final`  — locked & sent to the patient
   * - `draft`  — saved against the patient, can be re-opened from /consultations
   * - `none`   — no Rx was kept (consult was discarded or had nothing in it)
   */
  rxStatus?: 'final' | 'draft' | 'none';
  /** Whether the doctor printed the Rx when finalising. */
  printed?: boolean;
}
