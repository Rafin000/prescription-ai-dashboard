import { apiGet, apiPatch } from '../lib/http';
import type { Medicine } from '../types';

export interface MedicineNotePatch {
  rating?: number;
  doctorNote?: string;
}

export const medicineService = {
  search: (q?: string) => apiGet<Medicine[]>('/medicines', { params: { q } }),
  list: () => apiGet<Medicine[]>('/medicines'),
  updateNote: (id: string, body: MedicineNotePatch) =>
    apiPatch<Medicine, MedicineNotePatch>(`/medicines/${id}`, body),
};
