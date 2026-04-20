export const qk = {
  all: ['pai'] as const,
  auth: () => [...qk.all, 'auth'] as const,
  me: () => [...qk.auth(), 'me'] as const,

  doctor: () => [...qk.all, 'doctor'] as const,
  currentDoctor: () => [...qk.doctor(), 'current'] as const,
  doctorAvailability: () => [...qk.doctor(), 'availability'] as const,

  patients: () => [...qk.all, 'patients'] as const,
  patientList: (q?: string) => [...qk.patients(), 'list', { q: q ?? '' }] as const,
  patient: (id: string) => [...qk.patients(), 'detail', id] as const,
  patientVitals: (id: string) => [...qk.patient(id), 'vitals'] as const,
  patientVisits: (id: string) => [...qk.patient(id), 'visits'] as const,
  patientLabs: (id: string) => [...qk.patient(id), 'labs'] as const,
  patientActiveMeds: (id: string) => [...qk.patient(id), 'active-meds'] as const,
  patientPrescriptions: (id: string) => [...qk.patient(id), 'prescriptions'] as const,

  prescriptions: () => [...qk.all, 'prescriptions'] as const,
  prescription: (id: string) => [...qk.prescriptions(), id] as const,

  appointments: () => [...qk.all, 'appointments'] as const,
  appointmentList: (from?: string, to?: string) =>
    [...qk.appointments(), 'list', { from: from ?? null, to: to ?? null }] as const,

  visits: () => [...qk.all, 'visits'] as const,
  allVisits: () => [...qk.visits(), 'all'] as const,

  medicines: () => [...qk.all, 'medicines'] as const,
  medicineSearch: (q?: string) => [...qk.medicines(), 'search', { q: q ?? '' }] as const,

  consult: () => [...qk.all, 'consult'] as const,
  consultScript: () => [...qk.consult(), 'script'] as const,

  labIntake: () => [...qk.all, 'lab-intake'] as const,
  labIntakeList: (status?: string) =>
    [...qk.labIntake(), 'list', { status: status ?? 'all' }] as const,

  team: () => [...qk.all, 'team'] as const,
  teamMembers: () => [...qk.team(), 'members'] as const,
  teamInvites: () => [...qk.team(), 'invites'] as const,
  publicInvite: (token: string) => ['public-invite', token] as const,

  billing: () => [...qk.all, 'billing'] as const,
  invoices: () => [...qk.billing(), 'invoices'] as const,
  upcomingInvoice: () => [...qk.billing(), 'upcoming'] as const,

  usage: () => [...qk.all, 'usage'] as const,
  usageSummary: () => [...qk.usage(), 'summary'] as const,
  usageEvents: (params?: { from?: string; to?: string; kind?: string }) =>
    [...qk.usage(), 'events', params ?? {}] as const,
};
