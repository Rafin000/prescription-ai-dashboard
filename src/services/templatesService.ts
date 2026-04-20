import { apiDelete, apiGet, apiPatch, apiPost } from '../lib/http';

export interface RxTemplateMedicine {
  name: string;
  dosage?: string;
  frequency?: string;
  duration?: string;
  notes?: string;
}

export interface RxTemplate {
  id: string;
  name: string;
  description?: string;
  tags: string[];
  chiefComplaint?: string;
  diagnoses: string[];
  tests: string[];
  advice: string[];
  medicines: RxTemplateMedicine[];
  followUp?: string;
  notes?: string;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
  shared: boolean;
}

export interface UpsertTemplateRequest {
  name: string;
  description?: string;
  tags?: string[];
  chiefComplaint?: string;
  diagnoses?: string[];
  tests?: string[];
  advice?: string[];
  medicines?: RxTemplateMedicine[];
  followUp?: string;
  notes?: string;
  shared?: boolean;
}

export const templatesService = {
  list: () => apiGet<RxTemplate[]>('/templates'),
  create: (body: UpsertTemplateRequest) =>
    apiPost<RxTemplate, UpsertTemplateRequest>('/templates', body),
  update: (id: string, body: UpsertTemplateRequest) =>
    apiPatch<RxTemplate, UpsertTemplateRequest>(`/templates/${id}`, body),
  remove: (id: string) => apiDelete<void>(`/templates/${id}`),
  use: (id: string) => apiPost<RxTemplate, Record<string, never>>(`/templates/${id}/use`, {}),
};
