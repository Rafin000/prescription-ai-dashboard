import { apiGet, apiPatch, http } from '../lib/http';
import type { Doctor } from '../types';

export type DoctorProfilePatch = Partial<
  Pick<Doctor, 'name' | 'nameBn' | 'degrees' | 'specialty' | 'bmdcNo' | 'phone' | 'email' | 'signatureUrl'>
>;

async function uploadImage(
  path: '/doctor/avatar' | '/doctor/signature',
  file: File,
): Promise<{ url: string }> {
  const form = new FormData();
  form.append('file', file);
  const r = await http.post<{ url: string }>(path, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return r.data;
}

export const doctorService = {
  getCurrent: () => apiGet<Doctor>('/doctor/me'),
  update: (body: DoctorProfilePatch) =>
    apiPatch<Doctor, DoctorProfilePatch>('/doctor/me', body),
  uploadAvatar: (file: File) => uploadImage('/doctor/avatar', file),
  uploadSignature: (file: File) => uploadImage('/doctor/signature', file),
};
