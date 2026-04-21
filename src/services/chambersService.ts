import { apiDelete, apiPatch, apiPost } from '../lib/http';

export interface ChamberInput {
  name: string;
  address: string;
  phone?: string;
  area?: string;
  city?: string;
  timeLabel?: string;
  lat?: number;
  lng?: number;
}

export interface ChamberRecord extends ChamberInput {
  id: string;
}

export const chambersService = {
  create: (body: ChamberInput) =>
    apiPost<ChamberRecord, ChamberInput>('/chambers', body),
  update: (id: string, body: ChamberInput) =>
    apiPatch<ChamberRecord, ChamberInput>(`/chambers/${id}`, body),
  remove: (id: string) => apiDelete<void>(`/chambers/${id}`),
};
