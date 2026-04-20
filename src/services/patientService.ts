import { apiGet, apiPatch, apiPost } from '../lib/http';
import type {
  ActiveMedicine,
  LabTest,
  Patient,
  PatientEmergencyContact,
  Prescription,
  Sex,
  Visit,
  Vital,
} from '../types';

export interface NewPatientRequest {
  name: string;
  nameBn?: string;
  age: number;
  sex: Sex;
  phone: string;
  address?: string;
  bloodGroup?: string;
}

export interface UpdatePatientRequest {
  name?: string;
  nameBn?: string;
  age?: number;
  sex?: Sex;
  phone?: string;
  address?: string;
  bloodGroup?: string;
  allergies?: string[];
  emergencyContact?: PatientEmergencyContact | null;
}

export const patientService = {
  list: (q?: string) => apiGet<Patient[]>('/patients', { params: { q } }),
  get: (id: string) => apiGet<Patient>(`/patients/${id}`),
  create: (body: NewPatientRequest) =>
    apiPost<Patient, NewPatientRequest>('/patients', body),
  update: (id: string, body: UpdatePatientRequest) =>
    apiPatch<Patient, UpdatePatientRequest>(`/patients/${id}`, body),
  vitals: (id: string) => apiGet<Vital[]>(`/patients/${id}/vitals`),
  visits: (id: string) => apiGet<Visit[]>(`/patients/${id}/visits`),
  labs: (id: string) => apiGet<LabTest[]>(`/patients/${id}/labs`),
  activeMeds: (id: string) => apiGet<ActiveMedicine[]>(`/patients/${id}/active-meds`),
  prescriptions: (id: string) => apiGet<Prescription[]>(`/patients/${id}/prescriptions`),
};
