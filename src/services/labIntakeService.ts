import { apiDelete, apiGet, apiPatch, apiPost } from '../lib/http';
import type {
  LabIntake,
  LabIntakeExtracted,
  LabIntakeSuggestion,
} from '../types';

/**
 * What the client sends when uploading a report.
 *
 * `file*` fields describe the uploaded blob. `hints` is optional context
 * the AI should use when extracting — for example when the user uploads
 * from a specific patient's profile we already know the patient.
 *
 * In a real backend the file bytes are posted as multipart/form-data;
 * the rest of these fields stay the same.
 */
export interface UploadRequest {
  filename: string;
  sizeKb: number;
  mime: string;
  hints?: {
    patientId?: string;
    testId?: string;
    note?: string;
  };
}

/**
 * What the server returns after a successful upload.
 *
 * The AI runs asynchronously — the server immediately persists the
 * record with `status: "processing"` and populates `extracted` +
 * `suggestion` once the pipeline finishes. Clients poll `GET /lab-intake`
 * (or subscribe to a websocket) to see the updated record.
 */
export type UploadResponse = LabIntake;

/**
 * The AI pipeline's output — surfaced back to the client via the
 * `extracted` and `suggestion` fields on the LabIntake record.
 */
export interface AIExtractionResult {
  extracted: LabIntakeExtracted;
  suggestion?: LabIntakeSuggestion;
  /** Global confidence that this report was routed correctly. */
  overallConfidence: number;
}

export interface AssignRequest {
  patientId: string;
  testId?: string;
}

export const labIntakeService = {
  list: (status?: string) =>
    apiGet<LabIntake[]>('/lab-intake', { params: { status } }),

  /** Upload a new report. Server responds with the stored record (initially
   *  status: "processing"). Poll `list()` for the AI's extracted result. */
  upload: (body: UploadRequest) =>
    apiPost<UploadResponse, UploadRequest>('/lab-intake', body),

  /** Accept the AI's current suggestion on a `needs_review` record. */
  confirm: (id: string) =>
    apiPost<LabIntake, Record<string, never>>(`/lab-intake/${id}/confirm`, {}),

  /** Manually override routing — used when AI is wrong or unsure. */
  assign: (id: string, body: AssignRequest) =>
    apiPatch<LabIntake, AssignRequest>(`/lab-intake/${id}/assign`, body),

  /** Drop the report entirely (e.g. duplicate or misfire). */
  reject: (id: string) => apiDelete<void>(`/lab-intake/${id}`),
};
