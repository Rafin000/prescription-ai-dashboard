import { apiGet, apiPatch } from '../lib/http';
import type { Doctor } from '../types';

export type DoctorProfilePatch = Partial<
  Pick<Doctor, 'name' | 'nameBn' | 'degrees' | 'specialty' | 'bmdcNo' | 'phone' | 'email' | 'signatureUrl'>
>;

export const doctorService = {
  getCurrent: () => apiGet<Doctor>('/doctor/me'),
  update: (body: DoctorProfilePatch) =>
    apiPatch<Doctor, DoctorProfilePatch>('/doctor/me', body),
};
