import { apiGet } from '../lib/http';
import type { Prescription } from '../types';

export const prescriptionService = {
  get: (id: string) => apiGet<Prescription>(`/prescriptions/${id}`),
};
