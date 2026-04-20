import type { AppointmentStatus, AppointmentType, Sex } from './common';

/**
 * Patient info captured while booking an appointment for someone who
 * isn't yet in the system. We don't create a real Patient record at this
 * point — keeps the patient list clean of no-shows. The draft is
 * promoted to a full Patient when the consult / call actually starts.
 */
export interface AppointmentPatientDraft {
  name: string;
  nameBn?: string;
  age: number;
  sex: Sex;
  phone: string;
  address?: string;
  bloodGroup?: string;
}

export interface Appointment {
  id: string;
  /** Empty string until the appointment's `patientDraft` is promoted. */
  patientId: string;
  patientName: string;
  start: string;
  end: string;
  type: AppointmentType;
  status: AppointmentStatus;
  chamberId: string;
  note?: string;
  /** Optional presenting complaint / symptoms captured at booking time.
   *  When the consult starts, this seeds the Rx's chief complaint. */
  reason?: string;
  /** Captured patient info for brand-new patients, pre-promotion. */
  patientDraft?: AppointmentPatientDraft;
  /** Opaque token that lets the patient join the call via a public link —
   *  only used when type === 'tele'. */
  joinToken?: string;
  /** Populated after the patient opens the join link. */
  patientJoined?: boolean;
  /**
   * Presence flags for the video-call room. Either side joining opens
   * the room; when both flip back to false the meeting is considered
   * ended. Anyone can re-open the meeting by joining again.
   */
  doctorPresent?: boolean;
  patientPresent?: boolean;
  /** Filled when the first person joins and the room opens. */
  meetingStartedAt?: string;
  /** Filled when the last person leaves and the room empties out. */
  meetingEndedAt?: string;
  /** Link back to the surgical plan when `type === 'surgery'`. */
  surgicalPlanId?: string;
  /** Where the procedure/visit happens, if different from the chamber. */
  hospital?: string;
  /** Minutes blocked on the calendar — useful for surgery OT slots. */
  expectedDurationMin?: number;
  /** Short description printed on calendar blocks ("Appendectomy", etc.). */
  procedure?: string;
}

/** Minimal, public-safe appointment shape served to the guest patient via
 *  the /join/:token lookup. No internal IDs, no other patients' data. */
export interface GuestAppointment {
  appointmentId: string;
  start: string;
  end: string;
  doctor: {
    name: string;
    nameBn?: string;
    specialty: string;
    avatarUrl?: string;
  };
  chamber: {
    name: string;
  };
  patientName: string;
}
