import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  appointmentService,
  consultService,
  doctorService,
  guestService,
  labIntakeService,
  medicineService,
  patientService,
  prescriptionService,
  teamService,
  visitService,
  onboardingService,
  billingService,
  usageService,
  type AssignRequest,
  type ListUsageParams,
  type ChangePlanRequest,
  type CheckoutRequest,
  type InitiateCheckoutRequest,
  type InitiateCheckoutResponse,
  type VerifyCheckoutRequest,
  type VerifyCheckoutResponse,
  type FinalizeDraftRequest,
  type UpdateVisitDraftRequest,
  type InviteRequest,
  type MedicineNotePatch,
  type NewAppointmentRequest,
  type NewVisitRequest,
  type SaveAvailabilityRequest,
  type SaveChambersRequest,
  type SavePreferencesRequest,
  type SaveProfileRequest,
  type UploadRequest,
  type VisitWithRx,
} from '../services';
import type { DoctorProfilePatch } from '../services/doctorService';
import type {
  NewPatientRequest,
  UpdatePatientRequest,
} from '../services/patientService';
import type { TeamRole } from '../lib/permissions';
import { useAuthStore } from '../stores/authStore';
import type {
  Appointment,
  Availability,
  Doctor,
  Invite,
  Invoice,
  LabIntake,
  Medicine,
  Patient,
  Subscription,
  TeamMember,
  UsageEvent,
  UsageSummary,
} from '../types';
import { qk } from './keys';

/* ── doctor ───────────────────────────────────────────────────── */
export const useCurrentDoctor = () =>
  useQuery({
    queryKey: qk.currentDoctor(),
    queryFn: doctorService.getCurrent,
    staleTime: 5 * 60_000,
  });

export const useUpdateDoctor = () => {
  const client = useQueryClient();
  const setUser = useAuthStore((s) => s.setUser);
  return useMutation<Doctor, Error, DoctorProfilePatch>({
    mutationFn: (body) => doctorService.update(body),
    onSuccess: (updated) => {
      client.setQueryData<Doctor>(qk.currentDoctor(), updated);
      client.setQueryData<Doctor>(qk.me(), updated);
      setUser(updated);
    },
  });
};

/* ── patients ─────────────────────────────────────────────────── */
export const usePatients = (q?: string) =>
  useQuery({
    queryKey: qk.patientList(q),
    queryFn: () => patientService.list(q),
    staleTime: 60_000,
  });

export const useCreatePatient = () => {
  const client = useQueryClient();
  return useMutation<Patient, Error, NewPatientRequest>({
    mutationFn: (body) => patientService.create(body),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: qk.patients() });
    },
  });
};

export const useUpdatePatient = () => {
  const client = useQueryClient();
  return useMutation<Patient, Error, { id: string } & UpdatePatientRequest>({
    mutationFn: ({ id, ...body }) => patientService.update(id, body),
    onSuccess: (updated) => {
      client.setQueryData<Patient>(qk.patient(updated.id), updated);
      client.invalidateQueries({ queryKey: qk.patients() });
    },
  });
};

export const usePatient = (id: string | undefined) =>
  useQuery({
    queryKey: qk.patient(id ?? ''),
    queryFn: () => patientService.get(id!),
    enabled: !!id,
  });

export const usePatientVitals = (id: string | undefined) =>
  useQuery({
    queryKey: qk.patientVitals(id ?? ''),
    queryFn: () => patientService.vitals(id!),
    enabled: !!id,
  });

export const usePatientVisits = (id: string | undefined) =>
  useQuery({
    queryKey: qk.patientVisits(id ?? ''),
    queryFn: () => patientService.visits(id!),
    enabled: !!id,
  });

export const usePatientLabs = (id: string | undefined) =>
  useQuery({
    queryKey: qk.patientLabs(id ?? ''),
    queryFn: () => patientService.labs(id!),
    enabled: !!id,
  });

export const usePatientActiveMeds = (id: string | undefined) =>
  useQuery({
    queryKey: qk.patientActiveMeds(id ?? ''),
    queryFn: () => patientService.activeMeds(id!),
    enabled: !!id,
  });

export const usePatientPrescriptions = (id: string | undefined) =>
  useQuery({
    queryKey: qk.patientPrescriptions(id ?? ''),
    queryFn: () => patientService.prescriptions(id!),
    enabled: !!id,
  });

/* ── prescriptions ───────────────────────────────────────────── */
export const usePrescription = (id: string | undefined) =>
  useQuery({
    queryKey: qk.prescription(id ?? ''),
    queryFn: () => prescriptionService.get(id!),
    enabled: !!id,
  });

/* ── appointments ────────────────────────────────────────────── */
export const useAppointments = (from?: string, to?: string) =>
  useQuery({
    queryKey: qk.appointmentList(from, to),
    queryFn: () => appointmentService.list({ from, to }),
    staleTime: 30_000,
  });

export const useCreateAppointment = () => {
  const client = useQueryClient();
  return useMutation<Appointment, Error, NewAppointmentRequest>({
    mutationFn: appointmentService.create,
    onSuccess: () => {
      client.invalidateQueries({ queryKey: qk.appointments() });
    },
  });
};

/** Toggle a doctor/patient presence flag on an appointment's room. */
export const useSetAppointmentPresence = () => {
  const client = useQueryClient();
  return useMutation<
    Appointment,
    Error,
    { id: string; actor: 'doctor' | 'patient'; present: boolean }
  >({
    mutationFn: ({ id, actor, present }) =>
      appointmentService.setPresence(id, { actor, present }),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: qk.appointments() });
    },
  });
};

/** Promote an appointment's patientDraft into a real Patient record and
 *  link them up. Returns both the updated appointment and the new patient. */
export const usePromoteAppointmentDraft = () => {
  const client = useQueryClient();
  return useMutation<
    { appointment: Appointment; patient: Patient },
    Error,
    string
  >({
    mutationFn: (id) => appointmentService.promoteDraft(id),
    onSuccess: ({ patient }) => {
      client.invalidateQueries({ queryKey: qk.appointments() });
      client.invalidateQueries({ queryKey: qk.patients() });
      client.setQueryData<Patient>(qk.patient(patient.id), patient);
    },
  });
};

/* ── visits (history) ────────────────────────────────────────── */
export const useAllVisits = () =>
  useQuery({
    queryKey: qk.allVisits(),
    queryFn: visitService.listAll,
    staleTime: 30_000,
  });

/** Persist a finished consult/call as a Visit (+ optional Rx draft/final). */
export const useCreateVisit = () => {
  const client = useQueryClient();
  return useMutation<VisitWithRx, Error, NewVisitRequest>({
    mutationFn: visitService.create,
    onSuccess: (_, vars) => {
      client.invalidateQueries({ queryKey: qk.visits() });
      client.invalidateQueries({ queryKey: qk.patientVisits(vars.patientId) });
      client.invalidateQueries({ queryKey: qk.patientPrescriptions(vars.patientId) });
    },
  });
};

/** Promote a saved draft Rx attached to a visit to a finalised one. */
export const useFinalizeVisitDraft = () => {
  const client = useQueryClient();
  return useMutation<
    VisitWithRx,
    Error,
    { visitId: string; patientId: string } & FinalizeDraftRequest
  >({
    mutationFn: ({ visitId, patientId: _patientId, ...body }) =>
      visitService.finalizeDraft(visitId, body),
    onSuccess: (res, vars) => {
      client.invalidateQueries({ queryKey: qk.visits() });
      client.invalidateQueries({ queryKey: qk.patientVisits(vars.patientId) });
      client.invalidateQueries({ queryKey: qk.patientPrescriptions(vars.patientId) });
      if (res.prescription) {
        client.setQueryData(qk.prescription(res.prescription.id), res.prescription);
      }
    },
  });
};

/** Save edits to a draft without finalising it. */
export const useUpdateVisitDraft = () => {
  const client = useQueryClient();
  return useMutation<
    VisitWithRx,
    Error,
    { visitId: string; patientId: string } & UpdateVisitDraftRequest
  >({
    mutationFn: ({ visitId, patientId: _patientId, ...body }) =>
      visitService.updateDraft(visitId, body),
    onSuccess: (res, vars) => {
      client.invalidateQueries({ queryKey: qk.visits() });
      client.invalidateQueries({ queryKey: qk.patientVisits(vars.patientId) });
      client.invalidateQueries({ queryKey: qk.patientPrescriptions(vars.patientId) });
      if (res.prescription) {
        client.setQueryData(qk.prescription(res.prescription.id), res.prescription);
      }
    },
  });
};

/* ── medicines ───────────────────────────────────────────────── */
export const useMedicineSearch = (q?: string) =>
  useQuery({
    queryKey: qk.medicineSearch(q),
    queryFn: () => medicineService.search(q),
    staleTime: 60_000,
  });

export const useUpdateMedicineNote = () => {
  const client = useQueryClient();
  return useMutation<Medicine, Error, { id: string } & MedicineNotePatch>({
    mutationFn: ({ id, ...body }) => medicineService.updateNote(id, body),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: qk.medicines() });
    },
  });
};

/* ── consult ─────────────────────────────────────────────────── */
export const useConsultScript = () =>
  useQuery({
    queryKey: qk.consultScript(),
    queryFn: consultService.getScript,
    staleTime: Infinity,
  });

/* ── lab intake ──────────────────────────────────────────────── */
export const useLabIntake = (status?: string) =>
  useQuery({
    queryKey: qk.labIntakeList(status),
    queryFn: () => labIntakeService.list(status),
    refetchInterval: (q) => {
      const rows = q.state.data as LabIntake[] | undefined;
      return rows?.some((r) => r.status === 'processing') ? 1500 : false;
    },
    staleTime: 10_000,
  });

export const useUploadLabReport = () => {
  const client = useQueryClient();
  return useMutation<LabIntake, Error, UploadRequest>({
    mutationFn: labIntakeService.upload,
    onSuccess: () => {
      client.invalidateQueries({ queryKey: qk.labIntake() });
    },
  });
};

export const useConfirmLabReport = () => {
  const client = useQueryClient();
  return useMutation<LabIntake, Error, string>({
    mutationFn: labIntakeService.confirm,
    onSuccess: () => {
      client.invalidateQueries({ queryKey: qk.labIntake() });
      client.invalidateQueries({ queryKey: qk.patients() });
    },
  });
};

export const useAssignLabReport = () => {
  const client = useQueryClient();
  return useMutation<LabIntake, Error, { id: string } & AssignRequest>({
    mutationFn: ({ id, ...body }) => labIntakeService.assign(id, body),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: qk.labIntake() });
      client.invalidateQueries({ queryKey: qk.patients() });
    },
  });
};

export const useRejectLabReport = () => {
  const client = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: labIntakeService.reject,
    onSuccess: () => {
      client.invalidateQueries({ queryKey: qk.labIntake() });
    },
  });
};

/* ── guest join (public) ─────────────────────────────────── */
export const useGuestAppointment = (token: string | undefined) =>
  useQuery({
    queryKey: ['guest', 'appointment', token ?? ''],
    queryFn: () => guestService.getAppointment(token!),
    enabled: !!token,
    retry: false,
  });

/* ── team ────────────────────────────────────────────────── */
export const useTeamMembers = () =>
  useQuery({
    queryKey: qk.teamMembers(),
    queryFn: teamService.listMembers,
    staleTime: 30_000,
  });

export const useTeamInvites = () =>
  useQuery({
    queryKey: qk.teamInvites(),
    queryFn: teamService.listInvites,
    staleTime: 30_000,
  });

export const useInviteMember = () => {
  const client = useQueryClient();
  return useMutation<Invite, Error, InviteRequest>({
    mutationFn: teamService.invite,
    onSuccess: () => {
      client.invalidateQueries({ queryKey: qk.team() });
    },
  });
};

export const useRevokeInvite = () => {
  const client = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: teamService.revokeInvite,
    onSuccess: () => {
      client.invalidateQueries({ queryKey: qk.teamInvites() });
    },
  });
};

export const useResendInvite = () => {
  const client = useQueryClient();
  return useMutation<Invite, Error, string>({
    mutationFn: teamService.resendInvite,
    onSuccess: () => {
      client.invalidateQueries({ queryKey: qk.teamInvites() });
    },
  });
};

export const useUpdateMemberRole = () => {
  const client = useQueryClient();
  return useMutation<TeamMember, Error, { userId: string; role: TeamRole }>({
    mutationFn: ({ userId, role }) => teamService.updateMemberRole(userId, role),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: qk.teamMembers() });
    },
  });
};

export const useRemoveMember = () => {
  const client = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: teamService.removeMember,
    onSuccess: () => {
      client.invalidateQueries({ queryKey: qk.teamMembers() });
    },
  });
};

/* ── public invite accept flow ────────────────────────────── */
export const usePublicInvite = (token: string | undefined) =>
  useQuery({
    queryKey: qk.publicInvite(token ?? ''),
    queryFn: () => teamService.getPublicInvite(token!),
    enabled: !!token,
    retry: false,
  });

/* ── onboarding ────────────────────────────────────────────── */

/**
 * Each onboarding mutation echoes the updated `Doctor` so the auth store
 * (and therefore the gate) immediately reflects the new step. Sharing a
 * single `setDoctor` helper keeps the cache + zustand store + localStorage
 * in lock-step.
 */
function useDoctorMirror() {
  const client = useQueryClient();
  const setUser = useAuthStore((s) => s.setUser);
  return (doc: Doctor) => {
    client.setQueryData<Doctor>(qk.currentDoctor(), doc);
    client.setQueryData<Doctor>(qk.me(), doc);
    setUser(doc);
  };
}

export const useDoctorAvailability = () =>
  useQuery({
    queryKey: qk.doctorAvailability(),
    queryFn: onboardingService.getAvailability,
    staleTime: 60_000,
  });

export const useSaveOnboardingProfile = () => {
  const mirror = useDoctorMirror();
  return useMutation<Doctor, Error, SaveProfileRequest>({
    mutationFn: onboardingService.saveProfile,
    onSuccess: mirror,
  });
};

export const useSaveOnboardingChambers = () => {
  const mirror = useDoctorMirror();
  return useMutation<Doctor, Error, SaveChambersRequest>({
    mutationFn: onboardingService.saveChambers,
    onSuccess: mirror,
  });
};

export const useSaveOnboardingAvailability = () => {
  const client = useQueryClient();
  const mirror = useDoctorMirror();
  return useMutation<Doctor, Error, SaveAvailabilityRequest>({
    mutationFn: onboardingService.saveAvailability,
    onSuccess: (doc, vars) => {
      mirror(doc);
      client.setQueryData<Availability>(qk.doctorAvailability(), vars.availability);
    },
  });
};

export const useSaveOnboardingPreferences = () => {
  const mirror = useDoctorMirror();
  return useMutation<Doctor, Error, SavePreferencesRequest>({
    mutationFn: onboardingService.savePreferences,
    onSuccess: mirror,
  });
};

export const useSkipOnboardingStep = () => {
  const mirror = useDoctorMirror();
  return useMutation<Doctor, Error, 'preferences' | 'team'>({
    mutationFn: onboardingService.skipStep,
    onSuccess: mirror,
  });
};

/**
 * Legacy in-app "pay with card" mutation — kept for the mock endpoint but
 * not used by the new SSLCommerz flow. Prefer `useInitiateCheckout`.
 */
export const useCheckoutSubscription = () => {
  const mirror = useDoctorMirror();
  return useMutation<{ doctor: Doctor; subscription: Subscription }, Error, CheckoutRequest>({
    mutationFn: onboardingService.checkout,
    onSuccess: ({ doctor }) => mirror(doctor),
  });
};

export const useFinishOnboarding = () => {
  const mirror = useDoctorMirror();
  return useMutation<Doctor, Error, void>({
    mutationFn: () => onboardingService.finish(),
    onSuccess: mirror,
  });
};

/* ── billing (SSLCommerz) ─────────────────────────────────── */

export const useInitiateCheckout = () =>
  useMutation<InitiateCheckoutResponse, Error, InitiateCheckoutRequest>({
    mutationFn: billingService.initiateCheckout,
  });

export const useVerifyCheckout = () => {
  const client = useQueryClient();
  const mirror = useDoctorMirror();
  return useMutation<VerifyCheckoutResponse, Error, VerifyCheckoutRequest>({
    mutationFn: billingService.verifyCheckout,
    onSuccess: (res) => {
      mirror(res.doctor);
      client.invalidateQueries({ queryKey: qk.invoices() });
    },
  });
};

export const useInvoices = () =>
  useQuery({
    queryKey: qk.invoices(),
    queryFn: billingService.listInvoices,
    staleTime: 30_000,
  });

export const useCancelSubscription = () => {
  const mirror = useDoctorMirror();
  return useMutation<
    { doctor: Doctor; subscription: Subscription },
    Error,
    void
  >({
    mutationFn: () => billingService.cancelSubscription(),
    onSuccess: ({ doctor }) => mirror(doctor),
  });
};

export const useResumeSubscription = () => {
  const mirror = useDoctorMirror();
  return useMutation<
    { doctor: Doctor; subscription: Subscription },
    Error,
    void
  >({
    mutationFn: () => billingService.resumeSubscription(),
    onSuccess: ({ doctor }) => mirror(doctor),
  });
};

export const useChangePlan = () =>
  useMutation<InitiateCheckoutResponse, Error, ChangePlanRequest>({
    mutationFn: billingService.changePlan,
  });

// Silence the unused-Invoice import if the type gets tree-shaken elsewhere.
export type { Invoice as BillingInvoice };

/* ── usage metering ─────────────────────────────────────── */

export const useUsageSummary = () =>
  useQuery<UsageSummary>({
    queryKey: qk.usageSummary(),
    queryFn: usageService.getSummary,
    staleTime: 30_000,
  });

export const useUsageEvents = (params?: ListUsageParams) =>
  useQuery<UsageEvent[]>({
    queryKey: qk.usageEvents(params),
    queryFn: () => usageService.listEvents(params),
    staleTime: 30_000,
  });

export const useUpcomingInvoice = () =>
  useQuery<Invoice>({
    queryKey: qk.upcomingInvoice(),
    queryFn: usageService.getUpcomingInvoice,
    staleTime: 15_000,
  });
