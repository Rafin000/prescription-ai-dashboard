export type LabIntakeStatus =
  | 'processing'
  | 'routed'
  | 'needs_review'
  | 'unidentified'
  | 'archived';

export interface LabIntakeExtracted {
  patientName?: string;
  patientId?: string;
  testName?: string;
  labName?: string;
  collectionDate?: string;
  summary?: string;
}

export interface LabIntakeSuggestion {
  patientId: string;
  patientName: string;
  testId?: string;
  testName?: string;
  confidence: number; // 0..1
  reason?: string;
}

export interface LabIntakeRouted {
  patientId: string;
  patientName: string;
  testId?: string;
  testName?: string;
  labId?: string;
  at: string;
}

export interface LabIntake {
  id: string;
  filename: string;
  mime: string;
  sizeKb: number;
  pages?: number;
  uploadedAt: string;
  uploadedBy: string;
  status: LabIntakeStatus;
  previewUrl?: string;
  extracted?: LabIntakeExtracted;
  suggestion?: LabIntakeSuggestion;
  routed?: LabIntakeRouted;
  note?: string;
}
