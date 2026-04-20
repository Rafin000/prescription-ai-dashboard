import type { AxiosInstance } from 'axios';
import MockAdapter from 'axios-mock-adapter';
import {
  activeMedsFor,
  appointmentsMock,
  checkoutSessions,
  consultScript,
  currentDoctor,
  currentTeam,
  doctorAvailability,
  invoices,
  labIntake,
  labsFor,
  medicineCatalog,
  patients,
  prescriptions,
  teamInvites,
  teamMembers,
  usageEvents,
  visitsFor,
  vitalsFor,
} from './data';
import type {
  Invoice,
  InvoiceLineItem,
  UsageKind,
  UsageSummary,
} from '../types';
import { USAGE_KIND_LABEL, USAGE_RATES_BDT } from '../types';
import type { Invite, LabIntake, Patient } from '../types';
import type { TeamRole } from '../lib/permissions';

export function attachMockAdapter(client: AxiosInstance): MockAdapter {
  const mock = new MockAdapter(client, { delayResponse: 180 });

  /* ── auth ───────────────────────────────────────────────────── */
  mock.onPost('/auth/login').reply((config) => {
    const { identifier, password } = JSON.parse(config.data ?? '{}');
    if (!identifier || !password) {
      return [400, { message: 'Please enter both email/phone and password.' }];
    }
    if (password.length < 4) {
      return [401, { message: 'Invalid credentials. Please try again.' }];
    }
    return [
      200,
      {
        accessToken: makeToken('access', 15),
        refreshToken: makeToken('refresh', 60 * 24 * 7),
        user: currentDoctor,
      },
    ];
  });

  mock.onPost('/auth/refresh').reply((config) => {
    const { refreshToken } = JSON.parse(config.data ?? '{}');
    if (!refreshToken || !refreshToken.startsWith('mock.refresh.')) {
      return [401, { message: 'Session expired. Please log in again.' }];
    }
    return [
      200,
      {
        accessToken: makeToken('access', 15),
        refreshToken: makeToken('refresh', 60 * 24 * 7),
      },
    ];
  });

  mock.onPost('/auth/logout').reply(204);

  mock.onGet('/auth/me').reply((config) => {
    const auth = config.headers?.Authorization as string | undefined;
    if (!auth?.startsWith('Bearer ')) return [401, { message: 'Unauthorized' }];
    return [200, currentDoctor];
  });

  /* ── doctor / patients ──────────────────────────────────────── */
  mock.onGet('/doctor/me').reply(() => [200, currentDoctor]);

  mock.onPatch('/doctor/me').reply((config) => {
    const body = JSON.parse(config.data ?? '{}');
    Object.assign(currentDoctor, body);
    return [200, currentDoctor];
  });

  mock.onGet('/patients').reply((config) => {
    const q = (config.params?.q as string | undefined)?.trim().toLowerCase();
    const rows = q
      ? patients.filter(
          (p) =>
            p.name.toLowerCase().includes(q) ||
            p.code.toLowerCase().includes(q) ||
            p.phone.includes(q)
        )
      : patients;
    return [200, rows];
  });

  mock.onGet(/\/patients\/[^/]+$/).reply((config) => {
    const id = config.url!.split('/').pop()!;
    const p = patients.find((x) => x.id === id);
    return p ? [200, p] : [404, { message: 'Patient not found' }];
  });

  mock.onPost('/patients').reply((config) => {
    const body = JSON.parse(config.data ?? '{}') as {
      name?: string;
      nameBn?: string;
      age?: number;
      sex?: 'male' | 'female' | 'other';
      phone?: string;
      address?: string;
      bloodGroup?: string;
    };
    if (!body.name?.trim()) return [400, { message: 'Name is required.' }];
    if (!body.phone?.trim()) return [400, { message: 'Phone number is required.' }];
    if (!body.age || body.age < 0) return [400, { message: 'Please enter a valid age.' }];
    if (!body.sex) return [400, { message: 'Please pick a sex.' }];

    const now = new Date();
    const nextCode = `PAI-${String(patients.length + 284).padStart(5, '0')}`;
    const created: Patient = {
      id: `pai-${Date.now().toString(36)}`,
      code: nextCode,
      name: body.name.trim(),
      nameBn: body.nameBn?.trim() || undefined,
      age: body.age,
      sex: body.sex,
      phone: body.phone.trim(),
      address: body.address?.trim() || '',
      bloodGroup: body.bloodGroup?.trim() || undefined,
      conditions: [],
      allergies: [],
      patientSince: now.toISOString(),
      visits: 0,
    };
    patients.unshift(created);
    return [201, created];
  });

  mock.onPatch(/\/patients\/[^/]+$/).reply((config) => {
    const id = config.url!.split('/').pop()!;
    const patient = patients.find((p) => p.id === id);
    if (!patient) return [404, { message: 'Patient not found' }];
    const body = JSON.parse(config.data ?? '{}') as Partial<{
      name: string;
      nameBn: string;
      age: number;
      sex: 'male' | 'female' | 'other';
      phone: string;
      address: string;
      bloodGroup: string;
      allergies: string[];
      emergencyContact: {
        name: string;
        relation: string;
        phone: string;
      } | null;
    }>;
    if (body.name !== undefined) {
      if (!body.name.trim()) return [400, { message: 'Name cannot be empty.' }];
      patient.name = body.name.trim();
    }
    if (body.nameBn !== undefined) patient.nameBn = body.nameBn.trim() || undefined;
    if (body.age !== undefined) {
      if (!body.age || body.age < 0) return [400, { message: 'Please enter a valid age.' }];
      patient.age = body.age;
    }
    if (body.sex !== undefined) patient.sex = body.sex;
    if (body.phone !== undefined) {
      if (!body.phone.trim()) return [400, { message: 'Phone cannot be empty.' }];
      patient.phone = body.phone.trim();
    }
    if (body.address !== undefined) patient.address = body.address.trim();
    if (body.bloodGroup !== undefined)
      patient.bloodGroup = body.bloodGroup.trim() || undefined;
    if (body.allergies !== undefined) patient.allergies = body.allergies;
    if (body.emergencyContact !== undefined) {
      patient.emergencyContact =
        body.emergencyContact && body.emergencyContact.name
          ? {
              name: body.emergencyContact.name,
              relation: body.emergencyContact.relation,
              phone: body.emergencyContact.phone,
            }
          : undefined;
    }
    return [200, patient];
  });

  mock.onGet(/\/patients\/[^/]+\/vitals$/).reply((config) => {
    const id = config.url!.split('/')[2];
    return [200, vitalsFor[id] ?? []];
  });

  mock.onGet(/\/patients\/[^/]+\/visits$/).reply((config) => {
    const id = config.url!.split('/')[2];
    return [200, visitsFor[id] ?? []];
  });

  mock.onGet(/\/patients\/[^/]+\/labs$/).reply((config) => {
    const id = config.url!.split('/')[2];
    return [200, labsFor[id] ?? []];
  });

  mock.onGet(/\/patients\/[^/]+\/active-meds$/).reply((config) => {
    const id = config.url!.split('/')[2];
    return [200, activeMedsFor[id] ?? []];
  });

  mock.onGet(/\/patients\/[^/]+\/prescriptions$/).reply((config) => {
    const id = config.url!.split('/')[2];
    return [200, prescriptions.filter((rx) => rx.patientId === id)];
  });

  mock.onGet(/\/prescriptions\/[^/]+$/).reply((config) => {
    const id = config.url!.split('/').pop()!;
    const rx = prescriptions.find((r) => r.id === id);
    return rx ? [200, rx] : [404, { message: 'Prescription not found' }];
  });

  /* ── appointments ───────────────────────────────────────────── */
  mock.onGet('/appointments').reply((config) => {
    const from = config.params?.from as string | undefined;
    const to = config.params?.to as string | undefined;
    const rows = appointmentsMock.filter((a) => {
      if (from && a.start < from) return false;
      if (to && a.start > to) return false;
      return true;
    });
    return [200, rows];
  });

  mock.onPost('/appointments').reply((config) => {
    const body = JSON.parse(config.data ?? '{}') as Partial<{
      patientId: string;
      patientName: string;
      patientDraft: {
        name: string;
        nameBn?: string;
        age: number;
        sex: 'male' | 'female' | 'other';
        phone: string;
        address?: string;
        bloodGroup?: string;
      };
      reason: string;
      start: string;
      end: string;
      type: 'consultation' | 'follow-up' | 'tele' | 'surgery';
      chamberId: string;
      note: string;
      procedure: string;
      hospital: string;
    }>;
    if (!body.patientName || !body.start || !body.end || !body.type) {
      return [400, { message: 'Missing required appointment fields.' }];
    }
    // Either an existing patientId OR a patientDraft is required.
    if (!body.patientId && !body.patientDraft) {
      return [400, { message: 'Pick a patient or register a new one for this booking.' }];
    }
    if (body.patientId && !patients.find((p) => p.id === body.patientId)) {
      return [404, { message: 'Patient not found.' }];
    }
    const id = `a-${Date.now().toString(36)}`;
    const created = {
      id,
      patientId: body.patientId ?? '',
      patientName: body.patientName,
      patientDraft: body.patientDraft,
      reason: body.reason?.trim() || undefined,
      start: body.start,
      end: body.end,
      type: body.type,
      status: 'scheduled' as const,
      chamberId: body.chamberId ?? currentDoctor.chambers[0].id,
      note: body.note,
      procedure: body.procedure,
      hospital: body.hospital,
      ...(body.type === 'tele' ? { joinToken: randToken() } : {}),
    };
    appointmentsMock.push(created);

    // If this is an operation booking, mirror the schedule onto the
    // patient's SurgicalPlan so the "Latest status" card picks it up.
    // Skipped entirely when the appointment is for a draft patient — no
    // patient record exists yet.
    if (body.type === 'surgery' && body.patientId) {
      const patient = patients.find((p) => p.id === body.patientId);
      if (patient) {
        const procedure =
          body.procedure?.trim() ||
          patient.surgicalPlan?.procedure ||
          'Operation';
        patient.surgicalPlan = {
          id: patient.surgicalPlan?.id ?? `sp-${Date.now().toString(36)}`,
          patientId: patient.id,
          procedure,
          urgency: patient.surgicalPlan?.urgency ?? 'elective',
          status: 'scheduled',
          indicatedBy: 'doctor',
          proposedAt: patient.surgicalPlan?.proposedAt ?? body.start,
          scheduledFor: body.start,
          appointmentId: id,
          hospital: body.hospital ?? patient.surgicalPlan?.hospital,
          surgeonId: patient.surgicalPlan?.surgeonId,
          surgeonName: patient.surgicalPlan?.surgeonName,
          preOpTestIds: patient.surgicalPlan?.preOpTestIds ?? [],
          consentFormUrl: patient.surgicalPlan?.consentFormUrl,
          postOpFollowUpIds: patient.surgicalPlan?.postOpFollowUpIds,
          notes: body.note ?? patient.surgicalPlan?.notes,
        };
      }
    }

    return [201, created];
  });

  /** Promote a booking's patientDraft to a real Patient record and link it. */
  mock.onPost(/\/appointments\/[^/]+\/promote$/).reply((config) => {
    const id = config.url!.split('/')[2];
    const appt = appointmentsMock.find((a) => a.id === id);
    if (!appt) return [404, { message: 'Appointment not found.' }];
    if (appt.patientId && patients.find((p) => p.id === appt.patientId)) {
      const p = patients.find((px) => px.id === appt.patientId)!;
      return [200, { appointment: appt, patient: p }];
    }
    if (!appt.patientDraft) {
      return [400, { message: 'Nothing to promote — no draft patient on this appointment.' }];
    }
    const draft = appt.patientDraft;
    const now = new Date();
    const nextCode = `PAI-${String(patients.length + 284).padStart(5, '0')}`;
    const created: typeof patients[number] = {
      id: `pai-${Date.now().toString(36)}`,
      code: nextCode,
      name: draft.name,
      nameBn: draft.nameBn,
      age: draft.age,
      sex: draft.sex,
      phone: draft.phone,
      address: draft.address ?? '',
      bloodGroup: draft.bloodGroup,
      conditions: [],
      allergies: [],
      patientSince: now.toISOString(),
      visits: 0,
    };
    patients.unshift(created);
    appt.patientId = created.id;
    appt.patientName = created.name;
    appt.patientDraft = undefined;
    return [200, { appointment: appt, patient: created }];
  });

  /** Generic PATCH /appointments/:id — partial updates from the client. */
  mock.onPatch(/\/appointments\/[^/]+$/).reply((config) => {
    const id = config.url!.split('/').pop()!;
    const appt = appointmentsMock.find((a) => a.id === id);
    if (!appt) return [404, { message: 'Appointment not found.' }];
    const body = JSON.parse(config.data ?? '{}') as Record<string, unknown>;
    Object.assign(appt, body);
    return [200, appt];
  });

  /**
   * Presence toggle for the video-call room. Mirrors Google Meet:
   *   - first join of either side opens the meeting
   *   - both absent → meeting ends
   *   - any later join reopens a fresh meeting (start timestamps reset)
   */
  mock.onPost(/\/appointments\/[^/]+\/presence$/).reply((config) => {
    const id = config.url!.split('/')[2];
    const appt = appointmentsMock.find((a) => a.id === id);
    if (!appt) return [404, { message: 'Appointment not found.' }];
    const body = JSON.parse(config.data ?? '{}') as {
      actor?: 'doctor' | 'patient';
      present?: boolean;
    };
    if (body.actor !== 'doctor' && body.actor !== 'patient') {
      return [400, { message: 'Invalid actor.' }];
    }
    const wasEmpty = !appt.doctorPresent && !appt.patientPresent;
    if (body.actor === 'doctor') appt.doctorPresent = !!body.present;
    if (body.actor === 'patient') {
      appt.patientPresent = !!body.present;
      if (body.present) appt.patientJoined = true;
    }
    const nowEmpty = !appt.doctorPresent && !appt.patientPresent;
    const now = new Date().toISOString();
    if (wasEmpty && !nowEmpty) {
      appt.meetingStartedAt = now;
      appt.meetingEndedAt = undefined;
    }
    if (!wasEmpty && nowEmpty) {
      appt.meetingEndedAt = now;
    }
    return [200, appt];
  });

  /** All visits across every patient — powers the /consultations list. */
  mock.onGet('/visits').reply(() => {
    const all = patients.flatMap((p) => visitsFor[p.id] ?? []);
    return [200, all.sort((a, b) => b.date.localeCompare(a.date))];
  });

  /** Persist a finished consult/call as a Visit (+ optional Rx). */
  mock.onPost('/visits').reply((config) => {
    const body = JSON.parse(config.data ?? '{}') as Partial<{
      patientId: string;
      patientName: string;
      type: 'consultation' | 'follow-up' | 'tele';
      startedAt: string;
      durationSec: number;
      rxStatus: 'final' | 'draft' | 'none';
      printed: boolean;
      draft: {
        chiefComplaint: string;
        diagnoses: string[];
        tests: string[];
        advice: string[];
        medicines: { id: string; brand: string; generic?: string; strength?: string; dose: string; duration: string; instruction?: string; comment?: string }[];
        followUp?: string;
        notes?: string;
        operation?: string;
      };
    }>;
    if (!body.patientId || !body.type || !body.startedAt || !body.rxStatus) {
      return [400, { message: 'Missing required visit fields.' }];
    }
    const patient = patients.find((p) => p.id === body.patientId);
    if (!patient) return [404, { message: 'Patient not found.' }];

    const durationLabel =
      typeof body.durationSec === 'number' && body.durationSec > 0
        ? `${Math.max(1, Math.round(body.durationSec / 60))} min`
        : undefined;

    const visitId = `v-${Date.now().toString(36)}`;
    let prescription: typeof prescriptions[number] | undefined;
    if (body.rxStatus !== 'none' && body.draft) {
      prescription = {
        id: `rx-${Date.now().toString(36)}`,
        patientId: patient.id,
        doctorId: currentDoctor.id,
        date: body.startedAt,
        chiefComplaint: body.draft.chiefComplaint,
        diagnoses: body.draft.diagnoses,
        tests: body.draft.tests,
        advice: body.draft.advice,
        medicines: body.draft.medicines,
        followUp: body.draft.followUp,
        notes: body.draft.notes,
        operation: body.draft.operation,
        status: body.rxStatus === 'final' ? 'final' : 'draft',
        printedAt: body.rxStatus === 'final' && body.printed ? new Date().toISOString() : undefined,
        visitId,
      };
      prescriptions.unshift(prescription);

      // If this is a finalised Rx with a non-empty operation plan, reflect
      // it into the patient's SurgicalPlan so the Latest status card picks
      // it up without any other wiring.
      if (body.rxStatus === 'final' && body.draft.operation?.trim()) {
        applyOperationPlan(patient, body.draft.operation, body.startedAt);
      }
    }

    const visit = {
      id: visitId,
      patientId: patient.id,
      date: body.startedAt,
      type: body.type,
      duration: durationLabel,
      chiefComplaint:
        body.draft?.chiefComplaint?.trim() ||
        (body.rxStatus === 'none' ? 'Consult — no notes captured' : 'Untitled consultation'),
      diagnoses: body.draft?.diagnoses ?? [],
      prescriptionId: prescription?.id,
      rxStatus: body.rxStatus,
      printed: body.rxStatus === 'final' ? !!body.printed : undefined,
    } as const;

    const list = visitsFor[patient.id] ?? (visitsFor[patient.id] = []);
    list.unshift(visit);
    patient.visits = (patient.visits ?? 0) + 1;

    return [201, { visit, prescription }];
  });

  /** Save edits to a draft Rx without finalising it. */
  mock.onPatch(/\/visits\/[^/]+\/draft$/).reply((config) => {
    const visitId = config.url!.split('/')[2];
    const body = JSON.parse(config.data ?? '{}') as Partial<{
      draft: {
        chiefComplaint: string;
        diagnoses: string[];
        tests: string[];
        advice: string[];
        medicines: { id: string; brand: string; generic?: string; strength?: string; dose: string; duration?: string; instruction?: string; note?: string }[];
        followUp?: string;
        notes?: string;
        operation?: string;
      };
    }>;
    if (!body.draft) return [400, { message: 'Updated Rx body is required.' }];

    let foundVisit: (typeof visitsFor)[string][number] | undefined;
    for (const list of Object.values(visitsFor)) {
      const v = list.find((x) => x.id === visitId);
      if (v) { foundVisit = v; break; }
    }
    if (!foundVisit) return [404, { message: 'Visit not found.' }];

    let rx = foundVisit.prescriptionId
      ? prescriptions.find((p) => p.id === foundVisit!.prescriptionId)
      : undefined;
    if (rx) {
      Object.assign(rx, {
        chiefComplaint: body.draft.chiefComplaint,
        diagnoses: body.draft.diagnoses,
        tests: body.draft.tests,
        advice: body.draft.advice,
        medicines: body.draft.medicines,
        followUp: body.draft.followUp,
        notes: body.draft.notes,
        operation: body.draft.operation,
        status: 'draft' as const,
      });
    } else {
      rx = {
        id: `rx-${Date.now().toString(36)}`,
        patientId: foundVisit.patientId,
        doctorId: currentDoctor.id,
        date: foundVisit.date,
        chiefComplaint: body.draft.chiefComplaint,
        diagnoses: body.draft.diagnoses,
        tests: body.draft.tests,
        advice: body.draft.advice,
        medicines: body.draft.medicines,
        followUp: body.draft.followUp,
        notes: body.draft.notes,
        operation: body.draft.operation,
        status: 'draft',
        visitId: foundVisit.id,
      };
      prescriptions.unshift(rx);
      foundVisit.prescriptionId = rx.id;
    }
    foundVisit.rxStatus = 'draft';
    foundVisit.chiefComplaint =
      body.draft.chiefComplaint?.trim() || foundVisit.chiefComplaint;
    foundVisit.diagnoses = body.draft.diagnoses ?? foundVisit.diagnoses;

    return [200, { visit: foundVisit, prescription: rx }];
  });

  /** Promote a draft Rx attached to a visit into a finalised Rx. */
  mock.onPost(/\/visits\/[^/]+\/finalize$/).reply((config) => {
    const visitId = config.url!.split('/')[2];
    const body = JSON.parse(config.data ?? '{}') as Partial<{
      draft: {
        chiefComplaint: string;
        diagnoses: string[];
        tests: string[];
        advice: string[];
        medicines: { id: string; brand: string; generic?: string; strength?: string; dose: string; duration: string; instruction?: string; comment?: string }[];
        followUp?: string;
        notes?: string;
        operation?: string;
      };
      printed: boolean;
    }>;
    if (!body.draft) return [400, { message: 'Updated Rx body is required.' }];

    let foundVisit: (typeof visitsFor)[string][number] | undefined;
    for (const list of Object.values(visitsFor)) {
      const v = list.find((x) => x.id === visitId);
      if (v) {
        foundVisit = v;
        break;
      }
    }
    if (!foundVisit) return [404, { message: 'Visit not found.' }];

    let rx = foundVisit.prescriptionId
      ? prescriptions.find((p) => p.id === foundVisit!.prescriptionId)
      : undefined;
    if (rx) {
      Object.assign(rx, {
        chiefComplaint: body.draft.chiefComplaint,
        diagnoses: body.draft.diagnoses,
        tests: body.draft.tests,
        advice: body.draft.advice,
        medicines: body.draft.medicines,
        followUp: body.draft.followUp,
        notes: body.draft.notes,
        operation: body.draft.operation,
        status: 'final' as const,
        printedAt: body.printed ? new Date().toISOString() : rx.printedAt,
        visitId: foundVisit.id,
      });
    } else {
      rx = {
        id: `rx-${Date.now().toString(36)}`,
        patientId: foundVisit.patientId,
        doctorId: currentDoctor.id,
        date: foundVisit.date,
        chiefComplaint: body.draft.chiefComplaint,
        diagnoses: body.draft.diagnoses,
        tests: body.draft.tests,
        advice: body.draft.advice,
        medicines: body.draft.medicines,
        followUp: body.draft.followUp,
        notes: body.draft.notes,
        operation: body.draft.operation,
        status: 'final',
        printedAt: body.printed ? new Date().toISOString() : undefined,
        visitId: foundVisit.id,
      };
      prescriptions.unshift(rx);
      foundVisit.prescriptionId = rx.id;
    }
    foundVisit.rxStatus = 'final';
    foundVisit.printed = !!body.printed;

    if (body.draft.operation?.trim()) {
      const patient = patients.find((p) => p.id === foundVisit!.patientId);
      if (patient) applyOperationPlan(patient, body.draft.operation, foundVisit.date);
    }

    return [200, { visit: foundVisit, prescription: rx }];
  });

  /* ── medicines ──────────────────────────────────────────────── */
  mock.onGet('/medicines').reply((config) => {
    const q = (config.params?.q as string | undefined)?.trim().toLowerCase();
    if (!q) return [200, medicineCatalog];
    const rows = medicineCatalog.filter(
      (m) =>
        m.brand.toLowerCase().includes(q) ||
        m.generic.toLowerCase().includes(q) ||
        m.company.toLowerCase().includes(q)
    );
    return [200, rows];
  });

  mock.onPatch(/\/medicines\/[^/]+$/).reply((config) => {
    const id = config.url!.split('/').pop()!;
    const body = JSON.parse(config.data ?? '{}');
    const m = medicineCatalog.find((x) => x.id === id);
    if (!m) return [404, { message: 'Medicine not found' }];
    Object.assign(m, body);
    return [200, m];
  });

  /* ── consult ────────────────────────────────────────────────── */
  mock.onGet('/consult/script').reply(200, consultScript);

  /* ── onboarding & availability ─────────────────────────────── */
  mock.onGet('/doctor/availability').reply(200, doctorAvailability);

  mock.onPut('/onboarding/profile').reply((config) => {
    const body = JSON.parse(config.data ?? '{}') as Partial<typeof currentDoctor>;
    if (!body.name?.trim()) return [400, { message: 'Name is required.' }];
    if (!body.bmdcNo?.trim()) return [400, { message: 'BMDC registration is required.' }];
    Object.assign(currentDoctor, body);
    advanceOnboarding('chambers');
    return [200, currentDoctor];
  });

  mock.onPut('/onboarding/chambers').reply((config) => {
    const body = JSON.parse(config.data ?? '{}') as {
      chambers?: Array<Partial<(typeof currentDoctor.chambers)[number]>>;
    };
    if (!Array.isArray(body.chambers) || body.chambers.length === 0) {
      return [400, { message: 'Add at least one chamber to continue.' }];
    }
    currentDoctor.chambers = body.chambers.map((c, idx) => ({
      id: c.id ?? `ch-${Date.now().toString(36)}-${idx}`,
      name: c.name ?? '',
      address: c.address ?? '',
      phone: c.phone,
      days: c.days ?? [],
      time: c.time ?? '',
      slots: c.slots,
    }));
    advanceOnboarding('availability');
    return [200, currentDoctor];
  });

  mock.onPut('/onboarding/availability').reply((config) => {
    const body = JSON.parse(config.data ?? '{}') as {
      availability?: { inPerson?: Record<string, unknown[]>; video?: unknown[] };
    };
    if (!body.availability) return [400, { message: 'Availability payload required.' }];
    doctorAvailability.inPerson = (body.availability.inPerson ?? {}) as typeof doctorAvailability.inPerson;
    doctorAvailability.video = (body.availability.video ?? []) as typeof doctorAvailability.video;
    advanceOnboarding('preferences');
    return [200, currentDoctor];
  });

  mock.onPut('/onboarding/preferences').reply((config) => {
    const body = JSON.parse(config.data ?? '{}') as {
      preferences?: typeof currentDoctor.preferences;
    };
    currentDoctor.preferences = { ...currentDoctor.preferences, ...body.preferences };
    advanceOnboarding('team');
    return [200, currentDoctor];
  });

  mock.onPost('/onboarding/skip').reply((config) => {
    const body = JSON.parse(config.data ?? '{}') as { step?: 'preferences' | 'team' };
    if (body.step === 'preferences') advanceOnboarding('team');
    else if (body.step === 'team') advanceOnboarding('payment');
    return [200, currentDoctor];
  });

  /* ── SSLCommerz billing ─────────────────────────────────────
   *
   * Real-world flow:
   *   1. Frontend  → POST /billing/sslcz/initiate   ← we're mocking this
   *   2. Backend   → SSLCommerz /gwprocess/v4/api.php  (store_id, store_passwd)
   *   3. Backend   returns GatewayPageURL + tran_id
   *   4. Frontend  redirects to GatewayPageURL
   *   5. User pays on SSLCommerz hosted page
   *   6. SSLCommerz → success_url / fail_url / cancel_url
   *   7. Frontend  → POST /billing/sslcz/verify { tranId }
   *   8. Backend   → SSLCommerz /validator/api/validationserverAPI.php
   *   9. Backend   flips subscription + issues invoice
   *
   * The mock collapses 2-3 and 6-8 into in-memory logic, but keeps the
   * request/response shapes identical, so swapping in a real backend is a
   * one-line baseURL change.
   */
  mock.onPost('/billing/sslcz/initiate').reply((config) => {
    const body = JSON.parse(config.data ?? '{}') as Partial<{
      planId: 'starter' | 'pro' | 'clinic';
      cycle: 'monthly' | 'yearly';
      successUrl: string;
      failUrl: string;
      cancelUrl: string;
    }>;
    if (!body.planId || !body.cycle) {
      return [400, { message: 'Pick a plan and billing cycle.' }];
    }
    const monthly = { starter: 1500, pro: 2500, clinic: 5000 }[body.planId];
    const amountBdt = body.cycle === 'yearly' ? monthly * 10 : monthly;
    const sessionKey = `sslcz-sess-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
    const tranId = `SSLCZ-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    checkoutSessions.push({
      sessionKey,
      tranId,
      planId: body.planId,
      cycle: body.cycle,
      amountBdt,
      status: 'pending',
      createdAt: new Date().toISOString(),
    });
    // In a real integration SSLCommerz returns us their GatewayPageURL — here
    // we point to our own mock hosted page which simulates the gateway UI.
    const gatewayUrl =
      `/mock/sslcz/${sessionKey}` +
      `?tran_id=${encodeURIComponent(tranId)}` +
      `&success_url=${encodeURIComponent(body.successUrl ?? '/billing/success')}` +
      `&fail_url=${encodeURIComponent(body.failUrl ?? '/billing/failed')}` +
      `&cancel_url=${encodeURIComponent(body.cancelUrl ?? '/billing/cancelled')}`;
    return [200, { gatewayUrl, tranId, sessionKey, amountBdt }];
  });

  /** The mock gateway calls this to mark a session paid / failed / cancelled. */
  mock.onPost('/billing/sslcz/session/settle').reply((config) => {
    const body = JSON.parse(config.data ?? '{}') as Partial<{
      sessionKey: string;
      outcome: 'paid' | 'failed' | 'cancelled';
      method: string;
      methodHint: string;
    }>;
    const sess = checkoutSessions.find((s) => s.sessionKey === body.sessionKey);
    if (!sess) return [404, { message: 'Unknown checkout session.' }];
    sess.status = body.outcome ?? 'failed';
    if (body.outcome === 'paid') {
      const now = new Date();
      const periodEnd = new Date(now);
      if (sess.cycle === 'yearly') periodEnd.setFullYear(periodEnd.getFullYear() + 1);
      else periodEnd.setMonth(periodEnd.getMonth() + 1);

      // Drain the usage events that accrued this cycle into line items, then
      // mark them invoiced so the next cycle starts clean.
      const { lineItems, subscriptionBdt, usageBdt } = buildLineItems(
        sess.planId,
        sess.cycle,
        sess.amountBdt
      );

      const invoice: Invoice = {
        id: `inv-${Date.now().toString(36)}`,
        tranId: sess.tranId,
        planId: sess.planId,
        cycle: sess.cycle,
        amountBdt: subscriptionBdt + usageBdt,
        lineItems,
        subscriptionBdt,
        usageBdt,
        method: body.method,
        methodHint: body.methodHint,
        status: 'paid',
        createdAt: now.toISOString(),
        periodStart: now.toISOString(),
        periodEnd: periodEnd.toISOString(),
        receiptUrl: '#',
      };
      invoices.unshift(invoice);
    } else {
      invoices.unshift({
        id: `inv-${Date.now().toString(36)}`,
        tranId: sess.tranId,
        planId: sess.planId,
        cycle: sess.cycle,
        amountBdt: sess.amountBdt,
        lineItems: [],
        subscriptionBdt: sess.amountBdt,
        usageBdt: 0,
        status: body.outcome === 'cancelled' ? 'cancelled' : 'failed',
        createdAt: new Date().toISOString(),
        periodStart: new Date().toISOString(),
        periodEnd: new Date().toISOString(),
      });
    }
    return [200, { ok: true }];
  });

  /** Post-payment verification — validates the tran_id and flips subscription. */
  mock.onPost('/billing/sslcz/verify').reply((config) => {
    const body = JSON.parse(config.data ?? '{}') as { tranId?: string };
    if (!body.tranId) return [400, { message: 'tranId is required.' }];
    const sess = checkoutSessions.find((s) => s.tranId === body.tranId);
    if (!sess) return [404, { message: 'Transaction not found.' }];
    if (sess.status !== 'paid') {
      return [
        402,
        {
          message:
            sess.status === 'cancelled'
              ? 'Payment was cancelled on the gateway.'
              : 'Payment did not complete. Please try again.',
        },
      ];
    }
    const invoice = invoices.find((i) => i.tranId === sess.tranId);
    if (!invoice) return [500, { message: 'Invoice missing for a paid session.' }];

    currentDoctor.subscription = {
      status: 'active',
      planId: sess.planId,
      cycle: sess.cycle,
      renewsAt: invoice.periodEnd,
      amountBdt: sess.amountBdt,
      lastTranId: sess.tranId,
      cancelAt: undefined,
    };
    advanceOnboarding('done');
    return [
      200,
      { doctor: currentDoctor, subscription: currentDoctor.subscription, invoice },
    ];
  });

  mock.onGet('/billing/invoices').reply(() => [200, [...invoices]]);

  mock.onPost('/billing/cancel').reply(() => {
    const sub = currentDoctor.subscription;
    if (!sub || sub.status === 'none') {
      return [400, { message: 'No active subscription to cancel.' }];
    }
    currentDoctor.subscription = {
      ...sub,
      status: 'active',
      cancelAt: sub.renewsAt ?? new Date().toISOString(),
    };
    return [200, { doctor: currentDoctor, subscription: currentDoctor.subscription }];
  });

  mock.onPost('/billing/resume').reply(() => {
    const sub = currentDoctor.subscription;
    if (!sub) return [400, { message: 'No subscription to resume.' }];
    currentDoctor.subscription = { ...sub, cancelAt: undefined };
    return [200, { doctor: currentDoctor, subscription: currentDoctor.subscription }];
  });

  // Changing plan goes through SSLCommerz as a fresh initiate — same response
  // shape, only the backend pro-rates / records the change once verify fires.
  mock.onPost('/billing/change-plan').reply((config) => {
    // Reuse initiate's logic by forwarding the payload shape.
    const body = JSON.parse(config.data ?? '{}') as Partial<{
      planId: 'starter' | 'pro' | 'clinic';
      cycle: 'monthly' | 'yearly';
      successUrl: string;
      failUrl: string;
      cancelUrl: string;
    }>;
    if (!body.planId || !body.cycle) {
      return [400, { message: 'Pick a plan and billing cycle.' }];
    }
    const monthly = { starter: 1500, pro: 2500, clinic: 5000 }[body.planId];
    const amountBdt = body.cycle === 'yearly' ? monthly * 10 : monthly;
    const sessionKey = `sslcz-sess-${Date.now().toString(36)}-chg`;
    const tranId = `SSLCZ-CHG-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    checkoutSessions.push({
      sessionKey,
      tranId,
      planId: body.planId,
      cycle: body.cycle,
      amountBdt,
      status: 'pending',
      createdAt: new Date().toISOString(),
    });
    const gatewayUrl =
      `/mock/sslcz/${sessionKey}` +
      `?tran_id=${encodeURIComponent(tranId)}` +
      `&success_url=${encodeURIComponent(body.successUrl ?? '/billing/success')}` +
      `&fail_url=${encodeURIComponent(body.failUrl ?? '/billing/failed')}` +
      `&cancel_url=${encodeURIComponent(body.cancelUrl ?? '/billing/cancelled')}`;
    return [200, { gatewayUrl, tranId, sessionKey, amountBdt }];
  });

  /* ── Usage (AI token metering) ─────────────────────────── */
  mock.onGet('/usage/summary').reply(() => [200, computeUsageSummary()]);

  mock.onGet('/usage/events').reply((config) => {
    const { from, to, kind, limit } = (config.params ?? {}) as {
      from?: string;
      to?: string;
      kind?: UsageKind;
      limit?: number;
    };
    const period = currentPeriod();
    const lo = from ?? period.start;
    const hi = to ?? period.end;
    const rows = usageEvents
      .filter((e) => e.at >= lo && e.at <= hi && (!kind || e.kind === kind))
      .sort((a, b) => b.at.localeCompare(a.at));
    return [200, typeof limit === 'number' ? rows.slice(0, limit) : rows];
  });

  mock.onGet('/billing/upcoming').reply(() => {
    const period = currentPeriod();
    const plan = currentDoctor.subscription?.planId ?? 'pro';
    const cycle = currentDoctor.subscription?.cycle ?? 'monthly';
    const basePrice = ({ starter: 1500, pro: 2500, clinic: 5000 } as const)[plan];
    const subscriptionBdt = cycle === 'yearly' ? basePrice * 10 : basePrice;
    const { lineItems, usageBdt } = buildLineItems(plan, cycle, subscriptionBdt, {
      previewOnly: true,
    });
    const inv: Invoice = {
      id: 'inv-upcoming',
      tranId: 'preview',
      planId: plan,
      cycle,
      amountBdt: subscriptionBdt + usageBdt,
      lineItems,
      subscriptionBdt,
      usageBdt,
      status: 'upcoming',
      createdAt: new Date().toISOString(),
      periodStart: period.start,
      periodEnd: period.end,
    };
    return [200, inv];
  });

  /**
   * Returns an Invoice-shaped breakdown of subscription + per-kind usage
   * line items for the current billing period. When `previewOnly` is set
   * we don't mark events invoiced (so the upcoming-invoice endpoint is
   * idempotent on refresh).
   */
  function buildLineItems(
    planId: 'starter' | 'pro' | 'clinic',
    cycle: 'monthly' | 'yearly',
    subscriptionBdt: number,
    opts?: { previewOnly?: boolean }
  ): { lineItems: InvoiceLineItem[]; subscriptionBdt: number; usageBdt: number } {
    const period = currentPeriod();
    const events = usageEvents.filter(
      (e) => e.at >= period.start && e.at <= period.end
    );
    const byKind: Partial<Record<UsageKind, number>> = {};
    for (const e of events) byKind[e.kind] = (byKind[e.kind] ?? 0) + e.tokens;

    const items: InvoiceLineItem[] = [
      {
        id: 'li-base',
        kind: 'subscription',
        label: `${planId[0].toUpperCase()}${planId.slice(1)} — ${cycle} subscription`,
        amountBdt: subscriptionBdt,
      },
    ];

    let usageBdt = 0;
    const kinds = Object.keys(byKind) as UsageKind[];
    kinds
      .sort((a, b) => (byKind[b] ?? 0) - (byKind[a] ?? 0))
      .forEach((k, idx) => {
        const tokens = byKind[k] ?? 0;
        if (!tokens) return;
        const amountBdt = Math.round((tokens / 1000) * USAGE_RATES_BDT[k]);
        usageBdt += amountBdt;
        items.push({
          id: `li-usage-${idx}`,
          kind: 'usage',
          usageKind: k,
          label: USAGE_KIND_LABEL[k],
          quantity: tokens,
          quantityUnit: 'tokens',
          unitPriceBdt: USAGE_RATES_BDT[k],
          amountBdt,
        });
      });

    // Keep semantics for the real-backend swap: when not a preview, real
    // implementation would stamp events as invoiced here. Mock keeps them.
    void opts;
    return { lineItems: items, subscriptionBdt, usageBdt };
  }

  function currentPeriod(): { start: string; end: string } {
    const renews = currentDoctor.subscription?.renewsAt;
    const cycle = currentDoctor.subscription?.cycle ?? 'monthly';
    const end = renews ? new Date(renews) : new Date();
    const start = new Date(end);
    if (cycle === 'yearly') start.setFullYear(start.getFullYear() - 1);
    else start.setMonth(start.getMonth() - 1);
    return { start: start.toISOString(), end: end.toISOString() };
  }

  function computeUsageSummary(): UsageSummary {
    const period = currentPeriod();
    const events = usageEvents.filter(
      (e) => e.at >= period.start && e.at <= period.end
    );
    const byKind: UsageSummary['byKind'] = {
      transcription: { tokens: 0, costBdt: 0 },
      'ai-fill': { tokens: 0, costBdt: 0 },
      'talk-to-ai': { tokens: 0, costBdt: 0 },
      summary: { tokens: 0, costBdt: 0 },
      other: { tokens: 0, costBdt: 0 },
    };
    const dailyMap = new Map<string, { tokens: number; costBdt: number }>();
    let totalTokens = 0;
    let totalCostBdt = 0;
    for (const e of events) {
      byKind[e.kind].tokens += e.tokens;
      byKind[e.kind].costBdt += e.costBdt;
      totalTokens += e.tokens;
      totalCostBdt += e.costBdt;
      const day = e.at.slice(0, 10);
      const d = dailyMap.get(day) ?? { tokens: 0, costBdt: 0 };
      d.tokens += e.tokens;
      d.costBdt += e.costBdt;
      dailyMap.set(day, d);
    }
    const daily = Array.from(dailyMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, v]) => ({ date, tokens: v.tokens, costBdt: Math.round(v.costBdt * 100) / 100 }));
    // Round cents for display parity.
    Object.values(byKind).forEach((v) => (v.costBdt = Math.round(v.costBdt * 100) / 100));
    return {
      periodStart: period.start,
      periodEnd: period.end,
      totalTokens,
      totalCostBdt: Math.round(totalCostBdt * 100) / 100,
      eventsCount: events.length,
      byKind,
      daily,
    };
  }

  /** Mock-only read endpoint — our fake hosted page renders these details. */
  mock.onGet(/\/billing\/sslcz\/session\/[^/]+$/).reply((config) => {
    const sessionKey = config.url!.split('/').pop()!;
    const sess = checkoutSessions.find((s) => s.sessionKey === sessionKey);
    if (!sess) return [404, { message: 'Unknown checkout session.' }];
    return [
      200,
      {
        sessionKey: sess.sessionKey,
        tranId: sess.tranId,
        planId: sess.planId,
        cycle: sess.cycle,
        amountBdt: sess.amountBdt,
        status: sess.status,
        doctor: {
          name: currentDoctor.name,
          email: currentDoctor.email,
        },
      },
    ];
  });

  mock.onPost('/onboarding/finish').reply(() => {
    advanceOnboarding('done');
    return [200, currentDoctor];
  });

  function advanceOnboarding(next: typeof currentDoctor.onboardingStep) {
    currentDoctor.onboardingStep = next;
    currentDoctor.onboardingComplete = next === 'done';
  }

  /**
   * Translate an Rx's free-form operation text into the patient's
   * SurgicalPlan. The first non-empty line is the procedure; remaining
   * lines become the plan notes. Urgency is inferred from keywords
   * ("emergency" / "urgent") — everything else defaults to elective.
   */
  function applyOperationPlan(
    patient: (typeof patients)[number],
    operationText: string,
    proposedAt: string
  ) {
    const lines = operationText
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
    if (lines.length === 0) return;
    const procedure = lines[0];
    const rest = lines.slice(1);
    const lower = operationText.toLowerCase();
    const urgency: 'emergency' | 'urgent' | 'elective' =
      lower.includes('emergency') ? 'emergency' :
      lower.includes('urgent') ? 'urgent' : 'elective';

    const prior = patient.surgicalPlan;
    patient.surgicalPlan = {
      id: prior?.id ?? `sp-${Date.now().toString(36)}`,
      patientId: patient.id,
      procedure,
      urgency: prior?.urgency ?? urgency,
      // Don't downgrade a scheduled plan back to 'proposed' when the
      // doctor updates notes — only set 'proposed' if there was no plan.
      status: prior?.status ?? 'proposed',
      indicatedBy: 'doctor',
      proposedAt: prior?.proposedAt ?? proposedAt,
      scheduledFor: prior?.scheduledFor,
      appointmentId: prior?.appointmentId,
      hospital: prior?.hospital,
      surgeonId: prior?.surgeonId,
      surgeonName: prior?.surgeonName,
      preOpTestIds: prior?.preOpTestIds ?? [],
      consentFormUrl: prior?.consentFormUrl,
      postOpFollowUpIds: prior?.postOpFollowUpIds,
      notes: rest.length ? rest.join('\n') : prior?.notes,
      confidence: undefined,
    };
  }

  /** Demo helper — wipes onboarding state so the flow can be re-tested. */
  mock.onPost('/dev/reset-onboarding').reply(() => {
    currentDoctor.onboardingStep = 'profile';
    currentDoctor.onboardingComplete = false;
    currentDoctor.subscription = { status: 'none' };
    return [200, currentDoctor];
  });

  /* ── guest video-call join (public — token-authorised) ──────── */
  mock.onGet(/\/join\/[^/]+$/).reply((config) => {
    const token = config.url!.split('/').pop()!;
    const appt = appointmentsMock.find((a) => a.joinToken === token);
    if (!appt) return [404, { message: 'This link is invalid or has expired.' }];
    const chamber = currentDoctor.chambers.find((c) => c.id === appt.chamberId)
      ?? currentDoctor.chambers[0];
    return [
      200,
      {
        appointmentId: appt.id,
        start: appt.start,
        end: appt.end,
        patientName: appt.patientName,
        doctor: {
          name: currentDoctor.name,
          nameBn: currentDoctor.nameBn,
          specialty: currentDoctor.specialty,
        },
        chamber: { name: chamber.name },
      },
    ];
  });

  mock.onPost(/\/join\/[^/]+\/announce$/).reply((config) => {
    const token = config.url!.split('/')[2];
    const appt = appointmentsMock.find((a) => a.joinToken === token);
    if (!appt) return [404, { message: 'This link is invalid or has expired.' }];
    const wasEmpty = !appt.doctorPresent && !appt.patientPresent;
    appt.patientJoined = true;
    appt.patientPresent = true;
    const now = new Date().toISOString();
    if (wasEmpty) {
      appt.meetingStartedAt = now;
      appt.meetingEndedAt = undefined;
    }
    return [200, { ok: true }];
  });

  /** Patient leaves the call — flips patientPresent off and closes the
   *  meeting if the doctor had already left. Any subsequent announce
   *  reopens a fresh meeting. */
  mock.onPost(/\/join\/[^/]+\/depart$/).reply((config) => {
    const token = config.url!.split('/')[2];
    const appt = appointmentsMock.find((a) => a.joinToken === token);
    if (!appt) return [404, { message: 'This link is invalid or has expired.' }];
    const wasEmpty = !appt.doctorPresent && !appt.patientPresent;
    appt.patientPresent = false;
    const nowEmpty = !appt.doctorPresent && !appt.patientPresent;
    if (!wasEmpty && nowEmpty) {
      appt.meetingEndedAt = new Date().toISOString();
    }
    return [200, { ok: true }];
  });

  /* ── lab intake inbox ──────────────────────────────────────── */
  mock.onGet('/lab-intake').reply((config) => {
    const status = config.params?.status as string | undefined;
    const rows = status ? labIntake.filter((r) => r.status === status) : labIntake;
    return [200, [...rows].sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt))];
  });

  mock.onPost('/lab-intake').reply((config) => {
    const body = JSON.parse(config.data ?? '{}') as {
      filename?: string;
      sizeKb?: number;
      mime?: string;
      hints?: { patientId?: string; testId?: string; note?: string };
    };
    const hintPatient = body.hints?.patientId
      ? patients.find((p) => p.id === body.hints!.patientId)
      : undefined;
    const hintTest =
      hintPatient && body.hints?.testId ? findTest(hintPatient.id, body.hints.testId) : undefined;
    const guess = guessFromFilename(body.filename ?? 'upload.pdf');

    const now = new Date().toISOString();
    const row: LabIntake = {
      id: `li-${Date.now()}`,
      filename: body.filename ?? 'upload.pdf',
      mime: body.mime ?? 'application/pdf',
      sizeKb: body.sizeKb ?? 0,
      uploadedAt: now,
      uploadedBy: 'You',
      status: 'processing',
      note: body.hints?.note,
    };
    labIntake.unshift(row);

    // Simulate the AI extraction finishing ~900ms later.
    setTimeout(() => {
      // Case 1 — uploader provided a patient hint. Trust it; AI just extracts.
      if (hintPatient) {
        row.extracted = {
          patientName: hintPatient.name,
          patientId: hintPatient.code,
          testName: hintTest?.name ?? guess.test,
          collectionDate: now.slice(0, 10),
          summary:
            'Report auto-read. Key values within expected range for a typical run of this test.',
        };
        row.suggestion = {
          patientId: hintPatient.id,
          patientName: hintPatient.name,
          testId: hintTest?.id,
          testName: hintTest?.name ?? guess.test,
          confidence: 1,
          reason: 'Uploader explicitly selected the patient.',
        };
        row.status = 'routed';
        row.routed = {
          patientId: hintPatient.id,
          patientName: hintPatient.name,
          testId: hintTest?.id,
          testName: hintTest?.name,
          at: new Date().toISOString(),
        };
        return;
      }

      // Case 2 — no hint; AI guesses from the file.
      if (guess.patient) {
        const testGuess = guess.test ? findTest(guess.patient.id, guess.test) : undefined;
        row.extracted = {
          patientName: guess.patient.name,
          patientId: guess.patient.code,
          testName: guess.test ?? testGuess?.name,
          collectionDate: now.slice(0, 10),
          summary:
            'Report auto-read. Key values within expected range for a typical run of this test.',
        };
        row.suggestion = {
          patientId: guess.patient.id,
          patientName: guess.patient.name,
          testId: testGuess?.id,
          testName: testGuess?.name ?? guess.test,
          confidence: guess.confidence,
          reason:
            guess.confidence >= 0.85
              ? 'Name & test resolved from filename and file header.'
              : 'Partial filename match only — please confirm.',
        };
        row.status = guess.confidence >= 0.85 ? 'routed' : 'needs_review';
        if (row.status === 'routed' && row.suggestion) {
          row.routed = {
            patientId: row.suggestion.patientId,
            patientName: row.suggestion.patientName,
            testId: row.suggestion.testId,
            testName: row.suggestion.testName,
            at: new Date().toISOString(),
          };
        }
      } else {
        row.extracted = {
          summary: 'AI could not read a patient or test identifier on this file.',
        };
        row.status = 'unidentified';
      }
    }, 900);

    return [202, row];
  });

  mock.onPost(/\/lab-intake\/[^/]+\/confirm$/).reply((config) => {
    const id = config.url!.split('/')[2];
    const row = labIntake.find((r) => r.id === id);
    if (!row || !row.suggestion) return [400, { message: 'No suggestion to confirm.' }];
    row.status = 'routed';
    row.routed = {
      patientId: row.suggestion.patientId,
      patientName: row.suggestion.patientName,
      testId: row.suggestion.testId,
      testName: row.suggestion.testName,
      at: new Date().toISOString(),
    };
    return [200, row];
  });

  mock.onPatch(/\/lab-intake\/[^/]+\/assign$/).reply((config) => {
    const id = config.url!.split('/')[2];
    const body = JSON.parse(config.data ?? '{}') as { patientId?: string; testId?: string };
    const row = labIntake.find((r) => r.id === id);
    if (!row) return [404, { message: 'Report not found.' }];
    const pt = patients.find((p) => p.id === body.patientId);
    if (!pt) return [400, { message: 'Pick a valid patient.' }];
    row.status = 'routed';
    row.routed = {
      patientId: pt.id,
      patientName: pt.name,
      testId: body.testId,
      testName: body.testId ? findTest(pt.id, body.testId)?.name : undefined,
      at: new Date().toISOString(),
    };
    return [200, row];
  });

  mock.onDelete(/\/lab-intake\/[^/]+$/).reply((config) => {
    const id = config.url!.split('/').pop()!;
    const idx = labIntake.findIndex((r) => r.id === id);
    if (idx === -1) return [404, { message: 'Not found' }];
    labIntake.splice(idx, 1);
    return [204, null];
  });

  /* ── team (authed) ──────────────────────────────────────────── */
  mock.onGet('/team').reply(200, currentTeam);

  mock.onGet('/team/members').reply(() => {
    const rows = [...teamMembers].sort((a, b) =>
      a.isOwner === b.isOwner ? a.joinedAt.localeCompare(b.joinedAt) : a.isOwner ? -1 : 1
    );
    return [200, rows];
  });

  mock.onPatch(/\/team\/members\/[^/]+$/).reply((config) => {
    const userId = config.url!.split('/').pop()!;
    const body = JSON.parse(config.data ?? '{}') as { role?: TeamRole };
    const member = teamMembers.find((m) => m.userId === userId);
    if (!member) return [404, { message: 'Member not found.' }];
    if (member.isOwner) {
      return [400, { message: "The workspace owner's role can't be changed." }];
    }
    if (body.role !== 'admin' && body.role !== 'assistant') {
      return [400, { message: 'Invalid role.' }];
    }
    member.role = body.role;
    return [200, member];
  });

  mock.onDelete(/\/team\/members\/[^/]+$/).reply((config) => {
    const userId = config.url!.split('/').pop()!;
    const idx = teamMembers.findIndex((m) => m.userId === userId);
    if (idx === -1) return [404, { message: 'Member not found.' }];
    if (teamMembers[idx].isOwner) {
      return [400, { message: "The workspace owner can't be removed." }];
    }
    teamMembers.splice(idx, 1);
    return [204, null];
  });

  mock.onGet('/team/invites').reply(() => {
    const rows = [...teamInvites].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return [200, rows];
  });

  mock.onPost('/team/invites').reply((config) => {
    const body = JSON.parse(config.data ?? '{}') as { email?: string; role?: TeamRole };
    if (!body.email || !body.role) {
      return [400, { message: 'Email and role are required.' }];
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(body.email)) {
      return [400, { message: 'Please enter a valid email address.' }];
    }
    if (body.role !== 'admin' && body.role !== 'assistant') {
      return [400, { message: 'Invalid role.' }];
    }
    const lowerEmail = body.email.toLowerCase();
    if (teamMembers.some((m) => m.email.toLowerCase() === lowerEmail)) {
      return [409, { message: 'That person is already on your team.' }];
    }
    // Replace any pending invite for the same email — one pending per address.
    const existingIdx = teamInvites.findIndex(
      (i) => i.email.toLowerCase() === lowerEmail && i.status === 'pending'
    );
    if (existingIdx !== -1) teamInvites.splice(existingIdx, 1);

    const now = new Date();
    const expires = new Date(now.getTime() + 7 * 24 * 60 * 60_000);
    const invite: Invite = {
      id: `inv-${Date.now()}`,
      teamId: currentTeam.id,
      email: body.email,
      role: body.role,
      status: 'pending',
      invitedBy: currentDoctor.id,
      invitedByName: currentDoctor.name,
      token: randToken(),
      createdAt: now.toISOString(),
      expiresAt: expires.toISOString(),
    };
    teamInvites.unshift(invite);
    return [201, invite];
  });

  mock.onDelete(/\/team\/invites\/[^/]+$/).reply((config) => {
    const id = config.url!.split('/').pop()!;
    const invite = teamInvites.find((i) => i.id === id);
    if (!invite) return [404, { message: 'Invite not found.' }];
    invite.status = 'revoked';
    return [204, null];
  });

  mock.onPost(/\/team\/invites\/[^/]+\/resend$/).reply((config) => {
    const id = config.url!.split('/')[3];
    const invite = teamInvites.find((i) => i.id === id);
    if (!invite) return [404, { message: 'Invite not found.' }];
    const now = new Date();
    invite.createdAt = now.toISOString();
    invite.expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60_000).toISOString();
    invite.status = 'pending';
    invite.token = randToken();
    return [200, invite];
  });

  /* ── public invite accept flow ──────────────────────────────── */
  mock.onGet(/\/invites\/[^/]+$/).reply((config) => {
    const token = config.url!.split('/').pop()!;
    const invite = teamInvites.find((i) => i.token === token);
    if (!invite) return [404, { message: 'This invite link is invalid or has already been used.' }];
    if (invite.status === 'accepted') {
      return [410, { message: 'This invite has already been accepted.' }];
    }
    if (invite.status === 'revoked') {
      return [410, { message: 'This invite was revoked by the workspace owner.' }];
    }
    if (new Date(invite.expiresAt).getTime() < Date.now()) {
      invite.status = 'expired';
      return [410, { message: 'This invite has expired.' }];
    }
    return [
      200,
      {
        token: invite.token,
        email: invite.email,
        role: invite.role,
        team: { name: currentTeam.name },
        invitedBy: { name: invite.invitedByName ?? 'Your teammate' },
        expiresAt: invite.expiresAt,
        status: invite.status,
      },
    ];
  });

  mock.onPost(/\/invites\/[^/]+\/accept$/).reply((config) => {
    const token = config.url!.split('/')[2];
    const body = JSON.parse(config.data ?? '{}') as { name?: string; password?: string; phone?: string };
    const invite = teamInvites.find((i) => i.token === token);
    if (!invite || invite.status !== 'pending') {
      return [410, { message: 'This invite link is invalid or has already been used.' }];
    }
    if (!body.name?.trim()) return [400, { message: 'Please enter your name.' }];
    if (!body.password || body.password.length < 6) {
      return [400, { message: 'Password must be at least 6 characters.' }];
    }
    invite.status = 'accepted';
    invite.acceptedAt = new Date().toISOString();
    teamMembers.push({
      id: `mem-${Date.now()}`,
      teamId: currentTeam.id,
      userId: `u-${Date.now()}`,
      name: body.name.trim(),
      email: invite.email,
      phone: body.phone,
      role: invite.role,
      status: 'active',
      joinedAt: new Date().toISOString(),
      isOwner: false,
    });
    return [200, { ok: true }];
  });

  /* ── fallback ───────────────────────────────────────────────── */
  mock.onAny().reply((config) => {
    console.warn('[mock] unhandled request', config.method?.toUpperCase(), config.url);
    return [404, { message: `Mock: no handler for ${config.method} ${config.url}` }];
  });

  return mock;
}

/** Naive filename → patient/test guesser used by the mock AI pipeline. */
function guessFromFilename(raw: string): {
  patient?: Patient;
  test?: string;
  confidence: number;
} {
  const name = raw.toLowerCase();
  // Explicit patient code wins.
  const codeMatch = name.match(/pai[-_]?(\d{3,})/);
  if (codeMatch) {
    const code = `PAI-${codeMatch[1]}`;
    const patient = patients.find((p) => p.code.toUpperCase() === code);
    if (patient) return { patient, test: guessTest(name), confidence: 0.95 };
  }
  // Then first-name match.
  const matched = patients.find((p) => {
    const first = p.name.toLowerCase().split(' ')[0];
    return name.includes(first);
  });
  if (matched) {
    const test = guessTest(name);
    const confidence = test ? 0.82 : 0.68;
    return { patient: matched, test, confidence };
  }
  // Test-only — still unidentified patient.
  return { test: guessTest(name), confidence: 0 };
}

function guessTest(name: string): string | undefined {
  if (name.includes('cbc')) return 'CBC with ESR';
  if (name.includes('cxr') || name.includes('chest')) return 'Chest X-ray PA view';
  if (name.includes('urine')) return 'Urine R/M/E + C/S';
  if (name.includes('hba1c') || name.includes('creatinine')) return 'HbA1c, S. Creatinine';
  if (name.includes('ecg')) return '12-lead ECG';
  if (name.includes('lipid')) return 'Lipid profile';
  return undefined;
}

function findTest(patientId: string, testHint?: string):
  | { id: string; name: string }
  | undefined {
  if (!testHint) return undefined;
  const tests = labsFor[patientId] ?? [];
  const lower = testHint.toLowerCase();
  const hit = tests.find(
    (t) =>
      t.name.toLowerCase() === lower || t.name.toLowerCase().includes(lower) || lower.includes(t.name.toLowerCase())
  );
  return hit ? { id: hit.id, name: hit.name } : undefined;
}

function randToken(): string {
  const buf = new Uint8Array(12);
  crypto.getRandomValues(buf);
  return Array.from(buf)
    .map((b) => b.toString(36).padStart(2, '0'))
    .join('')
    .slice(0, 18);
}

function makeToken(kind: 'access' | 'refresh', minutes: number): string {
  const payload = {
    kind,
    exp: Date.now() + minutes * 60_000,
    sub: currentDoctor.id,
  };
  return `mock.${kind}.${btoa(JSON.stringify(payload))}`;
}
