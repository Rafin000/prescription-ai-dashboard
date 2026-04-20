import { apiGet } from '../lib/http';
import type { ConsultTurn } from '../types';

export const consultService = {
  getScript: () => apiGet<ConsultTurn[]>('/consult/script'),
};
