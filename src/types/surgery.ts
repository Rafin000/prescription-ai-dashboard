export type SurgicalUrgency = 'emergency' | 'urgent' | 'elective';

export type SurgicalPlanStatus =
  | 'proposed'
  | 'confirmed'
  | 'scheduled'
  | 'done'
  | 'cancelled';

export type SurgicalPlanSource =
  | 'doctor'
  | 'ai_transcript'
  | 'ai_report'
  | 'referral';

export interface SurgicalPlan {
  id: string;
  patientId: string;
  procedure: string;
  urgency: SurgicalUrgency;
  status: SurgicalPlanStatus;
  /** How the plan came into the system — surfaces in audit / UI hints. */
  indicatedBy: SurgicalPlanSource;
  proposedAt: string;
  scheduledFor?: string;
  appointmentId?: string;
  hospital?: string;
  surgeonId?: string;
  surgeonName?: string;
  preOpTestIds: string[];
  consentFormUrl?: string;
  postOpFollowUpIds?: string[];
  notes?: string;
  confidence?: number; // 0..1 — only populated when AI-indicated
}
