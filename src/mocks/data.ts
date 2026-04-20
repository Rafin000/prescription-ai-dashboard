import type {
  ActiveMedicine,
  Appointment,
  Availability,
  ConsultTurn,
  Doctor,
  Invite,
  Invoice,
  LabIntake,
  LabTest,
  Medicine,
  Patient,
  Prescription,
  Team,
  TeamMember,
  UsageEvent,
  UsageKind,
  Visit,
  Vital,
} from '../types';
import { USAGE_RATES_BDT } from '../types';

/** Invoices we've issued so far — grows on each successful SSLCommerz run. */
export const invoices: Invoice[] = [
  (() => {
    const lineItems = [
      {
        id: 'li-1-base',
        kind: 'subscription' as const,
        label: 'Pro — monthly subscription',
        amountBdt: 2500,
      },
      {
        id: 'li-1-trans',
        kind: 'usage' as const,
        usageKind: 'transcription' as UsageKind,
        label: 'Live transcription',
        quantity: 820_000,
        quantityUnit: 'tokens',
        unitPriceBdt: USAGE_RATES_BDT.transcription,
        amountBdt: Math.round((820_000 / 1000) * USAGE_RATES_BDT.transcription),
      },
      {
        id: 'li-1-fill',
        kind: 'usage' as const,
        usageKind: 'ai-fill' as UsageKind,
        label: 'Rx auto-fill',
        quantity: 140_000,
        quantityUnit: 'tokens',
        unitPriceBdt: USAGE_RATES_BDT['ai-fill'],
        amountBdt: Math.round((140_000 / 1000) * USAGE_RATES_BDT['ai-fill']),
      },
      {
        id: 'li-1-talk',
        kind: 'usage' as const,
        usageKind: 'talk-to-ai' as UsageKind,
        label: 'Talk-to-AI commands',
        quantity: 42_000,
        quantityUnit: 'tokens',
        unitPriceBdt: USAGE_RATES_BDT['talk-to-ai'],
        amountBdt: Math.round((42_000 / 1000) * USAGE_RATES_BDT['talk-to-ai']),
      },
    ];
    const subscriptionBdt = lineItems
      .filter((l) => l.kind === 'subscription')
      .reduce((n, l) => n + l.amountBdt, 0);
    const usageBdt = lineItems
      .filter((l) => l.kind === 'usage')
      .reduce((n, l) => n + l.amountBdt, 0);
    return {
      id: 'inv-seed-1',
      tranId: 'SSLCZ-20260319-7H9F',
      planId: 'pro' as const,
      cycle: 'monthly' as const,
      amountBdt: subscriptionBdt + usageBdt,
      lineItems,
      subscriptionBdt,
      usageBdt,
      method: 'Visa card',
      methodHint: 'ending in 4242',
      status: 'paid' as const,
      createdAt: '2026-03-19T10:12:00',
      periodStart: '2026-03-19T00:00:00',
      periodEnd: '2026-04-19T00:00:00',
      receiptUrl: '#',
    };
  })(),
];

/**
 * Seed usage events for the current billing period (last ~30 days). The
 * summary + upcoming-invoice endpoints derive from these.
 */
function seedUsageEvents(): UsageEvent[] {
  const today = new Date('2026-04-20T00:00:00');
  const samples: Array<{
    daysAgo: number;
    kind: UsageKind;
    tokens: number;
    patient?: { id: string; name: string };
    sessionId?: string;
    summary: string;
  }> = [
    { daysAgo: 0, kind: 'transcription', tokens: 42_000, patient: { id: 'pai-00284', name: 'Rahima Begum' }, sessionId: 'sess-1001', summary: 'Transcribed 16 min live consult' },
    { daysAgo: 0, kind: 'ai-fill', tokens: 6_500, patient: { id: 'pai-00284', name: 'Rahima Begum' }, sessionId: 'sess-1001', summary: 'Auto-filled Rx draft from transcript' },
    { daysAgo: 1, kind: 'transcription', tokens: 38_000, patient: { id: 'pai-00301', name: 'Mohammad Faisal' }, sessionId: 'sess-1002', summary: 'Transcribed 12 min video call' },
    { daysAgo: 1, kind: 'talk-to-ai', tokens: 3_100, patient: { id: 'pai-00301', name: 'Mohammad Faisal' }, sessionId: 'sess-1002', summary: '5 Talk-to-AI commands' },
    { daysAgo: 2, kind: 'summary', tokens: 4_400, patient: { id: 'pai-00322', name: 'Nusrat Jahan' }, summary: 'Visit summary generated' },
    { daysAgo: 3, kind: 'transcription', tokens: 51_000, patient: { id: 'pai-00355', name: 'Abdur Rahman' }, sessionId: 'sess-1003', summary: 'Transcribed 22 min consult' },
    { daysAgo: 3, kind: 'ai-fill', tokens: 8_200, patient: { id: 'pai-00355', name: 'Abdur Rahman' }, sessionId: 'sess-1003', summary: 'Auto-filled diagnoses + meds' },
    { daysAgo: 4, kind: 'transcription', tokens: 27_000, patient: { id: 'pai-00418', name: 'Tahmid Chowdhury' }, sessionId: 'sess-1004', summary: 'Transcribed 10 min follow-up' },
    { daysAgo: 5, kind: 'talk-to-ai', tokens: 2_200, summary: '3 Talk-to-AI commands' },
    { daysAgo: 6, kind: 'transcription', tokens: 33_000, patient: { id: 'pai-00301', name: 'Mohammad Faisal' }, summary: 'Transcribed 14 min call' },
    { daysAgo: 8, kind: 'transcription', tokens: 46_000, patient: { id: 'pai-00284', name: 'Rahima Begum' }, summary: 'Transcribed 18 min consult' },
    { daysAgo: 9, kind: 'ai-fill', tokens: 7_000, patient: { id: 'pai-00284', name: 'Rahima Begum' }, summary: 'Auto-filled advice section' },
    { daysAgo: 11, kind: 'summary', tokens: 3_800, summary: 'Visit summary generated' },
    { daysAgo: 12, kind: 'transcription', tokens: 29_000, patient: { id: 'pai-00355', name: 'Abdur Rahman' }, summary: 'Transcribed 11 min consult' },
    { daysAgo: 14, kind: 'transcription', tokens: 60_000, patient: { id: 'pai-00301', name: 'Mohammad Faisal' }, summary: 'Transcribed 24 min call' },
    { daysAgo: 15, kind: 'ai-fill', tokens: 9_400, patient: { id: 'pai-00301', name: 'Mohammad Faisal' }, summary: 'Auto-filled full Rx' },
    { daysAgo: 18, kind: 'transcription', tokens: 24_000, patient: { id: 'pai-00418', name: 'Tahmid Chowdhury' }, summary: 'Transcribed 9 min consult' },
    { daysAgo: 19, kind: 'talk-to-ai', tokens: 2_800, summary: '4 Talk-to-AI commands' },
    { daysAgo: 22, kind: 'transcription', tokens: 36_000, patient: { id: 'pai-00322', name: 'Nusrat Jahan' }, summary: 'Transcribed 14 min video call' },
    { daysAgo: 25, kind: 'ai-fill', tokens: 5_200, patient: { id: 'pai-00322', name: 'Nusrat Jahan' }, summary: 'Auto-filled tests + follow-up' },
  ];
  return samples.map((s, i) => {
    const at = new Date(today);
    at.setDate(at.getDate() - s.daysAgo);
    // spread within the day a little so the list doesn't look too clumped.
    at.setHours(10 + ((i * 37) % 10), (i * 13) % 60, 0, 0);
    const costBdt = (s.tokens / 1000) * USAGE_RATES_BDT[s.kind];
    return {
      id: `ue-${i + 1}`,
      at: at.toISOString(),
      kind: s.kind,
      tokens: s.tokens,
      costBdt: Math.round(costBdt * 100) / 100,
      sessionId: s.sessionId,
      patientId: s.patient?.id,
      patientName: s.patient?.name,
      summary: s.summary,
    };
  });
}

export const usageEvents: UsageEvent[] = seedUsageEvents();

/**
 * SSLCommerz-style checkout sessions the backend would normally track so it
 * can validate the `tran_id` the gateway echoes back.
 */
interface CheckoutSession {
  sessionKey: string;
  tranId: string;
  planId: 'starter' | 'pro' | 'clinic';
  cycle: 'monthly' | 'yearly';
  amountBdt: number;
  status: 'pending' | 'paid' | 'failed' | 'cancelled';
  createdAt: string;
}

export const checkoutSessions: CheckoutSession[] = [];

/**
 * Per-doctor weekly availability — keyed by chamber for in-person and a
 * flat list for video-call. Mirrors what gets persisted by the
 * /onboarding/availability endpoint.
 */
export const doctorAvailability: Availability = {
  inPerson: {
    'ch-1': [
      { weekday: 6, start: '18:00', end: '21:00' }, // Sat
      { weekday: 0, start: '18:00', end: '21:00' }, // Sun
      { weekday: 1, start: '18:00', end: '21:00' }, // Mon
      { weekday: 2, start: '18:00', end: '21:00' }, // Tue
    ],
    'ch-2': [
      { weekday: 3, start: '17:00', end: '20:00' }, // Wed
      { weekday: 4, start: '17:00', end: '20:00' }, // Thu
    ],
  },
  video: [
    { weekday: 1, start: '21:00', end: '22:00' },
    { weekday: 3, start: '21:00', end: '22:00' },
    { weekday: 5, start: '10:00', end: '12:00' },
  ],
};

export const currentDoctor: Doctor = {
  id: 'doc-001',
  role: 'admin',
  teamId: 'team-001',
  name: 'Dr. Ashraful Karim',
  nameBn: 'ডা. আশরাফুল করিম',
  degrees: ['MBBS', 'FCPS (Medicine)', 'MD (Cardiology)'],
  specialty: 'Consultant Cardiologist',
  bmdcNo: 'A-54321',
  phone: '+880 1711-000 001',
  email: 'dr.ashraful@prescriptionai.bd',
  chambers: [
    {
      id: 'ch-1',
      name: 'Popular Diagnostic — Dhanmondi',
      address: 'House 16, Road 2, Dhanmondi, Dhaka 1205',
      phone: '+880 9666-787-555',
      days: ['Sat', 'Sun', 'Mon', 'Tue'],
      time: '6:00 PM – 9:00 PM',
    },
    {
      id: 'ch-2',
      name: 'Square Hospital OPD',
      address: '18/F West Panthapath, Dhaka 1205',
      phone: '+880 2-8159457',
      days: ['Wed', 'Thu'],
      time: '5:00 PM – 8:00 PM',
    },
  ],
  onboardingStep: 'done',
  onboardingComplete: true,
  subscription: {
    status: 'active',
    planId: 'pro',
    cycle: 'monthly',
    renewsAt: '2026-05-19T00:00:00',
    amountBdt: 2500,
  },
  preferences: {
    rxLanguage: 'bilingual',
    defaultAppointmentMinutes: 20,
    rxFooter: 'Emergency: +880 1711-000 001 · Reports to dr.ashraful@prescriptionai.bd',
  },
};

export const patients: Patient[] = [
  {
    id: 'pai-00284',
    code: 'PAI-00284',
    name: 'Rahima Begum',
    nameBn: 'রহিমা বেগম',
    age: 54,
    sex: 'female',
    phone: '+880 1712-345 678',
    address: 'House 14, Road 7/A, Dhanmondi, Dhaka',
    bloodGroup: 'B+',
    allergies: ['NKDA'],
    conditions: [
      { name: 'Type 2 Diabetes', diagnosedYear: 2019, status: 'controlled' },
      { name: 'Hypertension', diagnosedYear: 2021, status: 'uncontrolled' },
    ],
    emergencyContact: { name: 'Karim Hossain', relation: 'son', phone: '+880 1815-998 210' },
    patientSince: '2019-03-11',
    visits: 18,
  },
  {
    id: 'pai-00301',
    code: 'PAI-00301',
    name: 'Mohammad Faisal',
    nameBn: 'মোহাম্মদ ফয়সাল',
    age: 42,
    sex: 'male',
    phone: '+880 1911-222 333',
    address: 'Sector 6, Uttara, Dhaka',
    bloodGroup: 'O+',
    allergies: ['Penicillin'],
    conditions: [{ name: 'Hypertension', diagnosedYear: 2023 }],
    patientSince: '2023-06-20',
    visits: 6,
  },
  {
    id: 'pai-00322',
    code: 'PAI-00322',
    name: 'Nusrat Jahan',
    nameBn: 'নুসরাত জাহান',
    age: 29,
    sex: 'female',
    phone: '+880 1511-888 444',
    address: 'Mohammadpur, Dhaka',
    bloodGroup: 'A+',
    conditions: [{ name: 'Migraine', diagnosedYear: 2022 }],
    patientSince: '2022-02-14',
    visits: 4,
  },
  {
    id: 'pai-00355',
    code: 'PAI-00355',
    name: 'Abdur Rahman',
    nameBn: 'আব্দুর রহমান',
    age: 67,
    sex: 'male',
    phone: '+880 1611-777 123',
    address: 'Gulshan 1, Dhaka',
    bloodGroup: 'AB+',
    conditions: [
      { name: 'IHD', diagnosedYear: 2018 },
      { name: 'CKD stage 3', diagnosedYear: 2020 },
    ],
    patientSince: '2018-09-05',
    visits: 24,
    surgicalPlan: {
      id: 'sp-1',
      patientId: 'pai-00355',
      procedure: 'CABG — triple vessel bypass',
      urgency: 'urgent',
      status: 'scheduled',
      indicatedBy: 'doctor',
      proposedAt: '2026-04-12T11:20:00',
      scheduledFor: '2026-04-28T08:00:00',
      appointmentId: 'a-surg-1',
      hospital: 'Square Hospital · OT-3',
      surgeonName: 'Dr. Farooq Ahmed (CTS)',
      preOpTestIds: ['preop-1', 'preop-2', 'preop-3'],
      notes:
        'Hold Aspirin 5 days pre-op. Anesthesia clearance done. Family briefed on risks.',
    },
  },
  {
    id: 'pai-00402',
    code: 'PAI-00402',
    name: 'Sumaiya Akter',
    nameBn: 'সুমাইয়া আক্তার',
    age: 34,
    sex: 'female',
    phone: '+880 1711-123 456',
    address: 'Mirpur 10, Dhaka',
    bloodGroup: 'B-',
    conditions: [{ name: 'Anemia', diagnosedYear: 2024 }],
    patientSince: '2024-01-10',
    visits: 2,
    surgicalPlan: {
      id: 'sp-2',
      patientId: 'pai-00402',
      procedure: 'Laparoscopic cholecystectomy',
      urgency: 'elective',
      status: 'proposed',
      indicatedBy: 'ai_transcript',
      proposedAt: '2026-04-19T09:05:00',
      preOpTestIds: [],
      confidence: 0.82,
      notes:
        'AI detected "gallstones, cholecystectomy next month" in last consult — awaiting confirmation.',
    },
  },
  {
    id: 'pai-00418',
    code: 'PAI-00418',
    name: 'Shahidul Islam',
    nameBn: 'শহীদুল ইসলাম',
    age: 58,
    sex: 'male',
    phone: '+880 1811-000 999',
    address: 'Banani, Dhaka',
    conditions: [{ name: 'Type 2 Diabetes', diagnosedYear: 2015 }],
    patientSince: '2015-11-02',
    visits: 32,
  },
];

export const vitalsFor: Record<string, Vital[]> = {
  'pai-00284': [
    {
      label: 'Blood Pressure',
      unit: 'mmHg',
      value: '140/90',
      delta: '↑ 8 from 12 Feb',
      tone: 'warn',
      trend: [120, 128, 135, 132, 138, 140, 142, 140],
    },
    {
      label: 'Weight',
      unit: 'kg',
      value: '68',
      delta: '↓ 0.5 kg over 7 visits',
      trend: [72, 71.5, 70.8, 70, 69.5, 69, 68.4, 68],
    },
    {
      label: 'HbA1c',
      unit: '%',
      value: '7.2',
      delta: '↓ 0.6 since Sep 2025',
      trend: [8.4, 8.1, 7.9, 7.6, 7.5, 7.3, 7.2],
    },
  ],
};

export const visitsFor: Record<string, Visit[]> = {
  'pai-00284': [
    {
      id: 'v-1',
      patientId: 'pai-00284',
      date: '2026-04-18T14:42:00',
      type: 'consultation',
      duration: '16 min',
      chiefComplaint: 'Productive cough × 5 days, low-grade fever, burning urination',
      diagnoses: ['Acute bronchitis', 'UTI — suspected', 'HTN — uncontrolled'],
      prescriptionId: 'rx-1',
      rxStatus: 'final',
      printed: true,
    },
    {
      id: 'v-2',
      patientId: 'pai-00284',
      date: '2026-03-02T11:00:00',
      type: 'follow-up',
      duration: '10 min',
      chiefComplaint: 'Routine DM + HTN review',
      diagnoses: ['Type 2 DM', 'HTN'],
      prescriptionId: 'rx-2',
      rxStatus: 'draft',
    },
    {
      id: 'v-3',
      patientId: 'pai-00284',
      date: '2026-01-14T10:30:00',
      type: 'follow-up',
      duration: '12 min',
      chiefComplaint: 'Knee pain, check sugar',
      diagnoses: ['Osteoarthritis — knee', 'Type 2 DM'],
      rxStatus: 'none',
    },
  ],
  'pai-00301': [
    {
      id: 'v-4',
      patientId: 'pai-00301',
      date: '2026-04-12T18:25:00',
      type: 'tele',
      duration: '8 min',
      chiefComplaint: 'BP review after starting Amlodipine',
      diagnoses: ['HTN — well controlled'],
      rxStatus: 'none',
    },
  ],
  'pai-00322': [
    {
      id: 'v-5',
      patientId: 'pai-00322',
      date: '2026-04-09T17:10:00',
      type: 'tele',
      duration: '12 min',
      chiefComplaint: 'Migraine — increasing frequency',
      diagnoses: ['Migraine — chronic'],
      prescriptionId: 'rx-3',
      rxStatus: 'draft',
    },
  ],
  'pai-00355': [
    {
      id: 'v-6',
      patientId: 'pai-00355',
      date: '2026-04-15T19:00:00',
      type: 'consultation',
      duration: '22 min',
      chiefComplaint: 'Chest tightness on exertion',
      diagnoses: ['IHD — stable angina'],
      rxStatus: 'none',
    },
  ],
  'pai-00418': [
    {
      id: 'v-7',
      patientId: 'pai-00418',
      date: '2026-03-28T18:40:00',
      type: 'follow-up',
      duration: '14 min',
      chiefComplaint: 'Routine T2DM review',
      diagnoses: ['Type 2 DM'],
      rxStatus: 'none',
    },
  ],
};

export const labsFor: Record<string, LabTest[]> = {
  'pai-00284': [
    { id: 'lab-1', patientId: 'pai-00284', name: 'CBC with ESR', orderedOn: '2026-04-18', status: 'pending' },
    { id: 'lab-2', patientId: 'pai-00284', name: 'Urine R/M/E + C/S', orderedOn: '2026-04-18', status: 'pending' },
    {
      id: 'lab-3',
      patientId: 'pai-00284',
      name: 'Chest X-ray PA view',
      orderedOn: '2026-04-18',
      status: 'collected',
      summary:
        'Mildly increased bronchovascular markings in both lung fields. No consolidation or pleural effusion. Cardiac silhouette within normal limits.',
      reportUrl: '#',
    },
    { id: 'lab-4', patientId: 'pai-00284', name: 'HbA1c, S. Creatinine', orderedOn: '2026-04-18', status: 'pending' },
  ],
};

export const activeMedsFor: Record<string, ActiveMedicine[]> = {
  'pai-00284': [
    { id: 'am-1', brand: 'Azin 500', generic: 'Azithromycin 500', dose: '1+0+0', duration: '4 days left', since: '18 Apr 2026', category: 'acute' },
    { id: 'am-2', brand: 'Seclo 20', generic: 'Omeprazole 20', dose: '1+0+1', duration: '14 days left', since: '18 Apr 2026', category: 'acute' },
    { id: 'am-3', brand: 'Amdocal 5', generic: 'Amlodipine 5 mg', dose: '0+0+1', duration: 'ongoing', since: '18 Sep 2025', category: 'chronic', adherence: 78 },
    { id: 'am-4', brand: 'Glimet 2', generic: 'Glimepiride + Metformin 2+500 mg', dose: '1+0+1', duration: 'ongoing', since: '15 Mar 2023', category: 'chronic', adherence: 92, forCondition: 'Type 2 DM' },
  ],
};

export const medicineCatalog: Medicine[] = [
  { id: 'm-1', brand: 'Napa', generic: 'Paracetamol', strength: '500 mg', company: 'Beximco', form: 'tablet', rating: 5 },
  { id: 'm-2', brand: 'Napa Extra', generic: 'Paracetamol + Caffeine', strength: '500+65 mg', company: 'Beximco', form: 'tablet', rating: 4 },
  { id: 'm-3', brand: 'Ace', generic: 'Paracetamol', strength: '500 mg', company: 'Square', form: 'tablet', rating: 5, doctorNote: 'Prefer for pediatric' },
  { id: 'm-4', brand: 'Azin', generic: 'Azithromycin', strength: '500 mg', company: 'Square', form: 'tablet', rating: 5 },
  { id: 'm-5', brand: 'Zimax', generic: 'Azithromycin', strength: '500 mg', company: 'Square', form: 'tablet', rating: 4 },
  { id: 'm-6', brand: 'Seclo', generic: 'Omeprazole', strength: '20 mg', company: 'Square', form: 'capsule', rating: 5 },
  { id: 'm-7', brand: 'Losectil', generic: 'Omeprazole', strength: '20 mg', company: 'Eskayef', form: 'capsule', rating: 4 },
  { id: 'm-8', brand: 'Amdocal', generic: 'Amlodipine', strength: '5 mg', company: 'Square', form: 'tablet', rating: 5 },
  { id: 'm-9', brand: 'Atova', generic: 'Atorvastatin', strength: '10 mg', company: 'Beximco', form: 'tablet', rating: 4 },
  { id: 'm-10', brand: 'Glimet', generic: 'Glimepiride + Metformin', strength: '2+500 mg', company: 'Square', form: 'tablet', rating: 5 },
  { id: 'm-11', brand: 'Maxpro', generic: 'Esomeprazole', strength: '20 mg', company: 'Renata', form: 'capsule', rating: 4 },
  { id: 'm-12', brand: 'Tory', generic: 'Atorvastatin', strength: '20 mg', company: 'Opsonin', form: 'tablet', rating: 3 },
];

export const prescriptions: Prescription[] = [
  {
    id: 'rx-1',
    patientId: 'pai-00284',
    doctorId: 'doc-001',
    date: '2026-04-18T14:42:00',
    chiefComplaint: 'Productive cough × 5 days, low-grade fever, burning urination × 2 days',
    diagnoses: ['Acute bronchitis', 'UTI — suspected', 'HTN — uncontrolled'],
    tests: ['CBC with ESR', 'Urine R/M/E + C/S', 'Chest X-ray PA view', 'HbA1c, S. Creatinine'],
    advice: [
      'Plenty of warm fluids, rest for 3 days',
      'Steam inhalation twice daily',
      'Low-salt diet; home BP monitoring daily (AM & PM)',
      'Return immediately if breathing difficulty or high fever',
    ],
    medicines: [
      { id: 'rm-1', brand: 'Azin 500', generic: 'Azithromycin', strength: '500 mg', dose: '1+0+0', duration: '5 days', instruction: 'Before meal' },
      { id: 'rm-2', brand: 'Napa Extra', generic: 'Paracetamol + Caffeine', strength: '500+65 mg', dose: '1+1+1', duration: '3 days', instruction: 'If fever > 100°F' },
      { id: 'rm-3', brand: 'Seclo 20', generic: 'Omeprazole', strength: '20 mg', dose: '1+0+1', duration: '14 days', instruction: 'Before meal' },
      { id: 'rm-4', brand: 'Ambrox', generic: 'Ambroxol', strength: '30 mg', dose: '1+1+1', duration: '5 days', instruction: 'After meal' },
    ],
    followUp: '5 days with reports',
    notes: 'Review BP chart at next visit',
    status: 'final',
    printedAt: '2026-04-18T14:58:00',
    visitId: 'v-1',
  },
  {
    id: 'rx-2',
    patientId: 'pai-00284',
    doctorId: 'doc-001',
    date: '2026-03-02T11:00:00',
    chiefComplaint: 'Routine DM + HTN review — sugar trending up over last 4 weeks',
    diagnoses: ['Type 2 DM — uncontrolled', 'HTN — controlled'],
    tests: ['HbA1c', 'Fasting + 2-hr post-prandial sugar', 'Lipid profile'],
    advice: [
      'Walk 30 min daily; avoid sweet drinks',
      'Recheck FBS twice a week, log readings',
    ],
    medicines: [
      { id: 'rm-d1', brand: 'Glimet', generic: 'Glimepiride + Metformin', strength: '2+500 mg', dose: '1+0+1', duration: '30 days', instruction: 'Before meal' },
      { id: 'rm-d2', brand: 'Amdocal', generic: 'Amlodipine', strength: '5 mg', dose: '0+0+1', duration: '30 days' },
    ],
    followUp: '4 weeks with HbA1c report',
    status: 'draft',
    visitId: 'v-2',
  },
  {
    id: 'rx-3',
    patientId: 'pai-00322',
    doctorId: 'doc-001',
    date: '2026-04-09T17:10:00',
    chiefComplaint: 'Migraine — increasing frequency, ~3 episodes/week',
    diagnoses: ['Migraine — chronic'],
    tests: ['MRI brain — if no improvement in 4 weeks'],
    advice: [
      'Maintain sleep & meal regularity, avoid known triggers',
      'Headache diary',
    ],
    medicines: [
      { id: 'rm-d3', brand: 'Tory', generic: 'Atorvastatin', strength: '20 mg', dose: '0+0+1', duration: '30 days', note: 'Add only if lipid profile abnormal' },
    ],
    followUp: '4 weeks',
    status: 'draft',
    visitId: 'v-5',
  },
];

export const appointmentsMock: Appointment[] = [
  { id: 'a-1', patientId: 'pai-00284', patientName: 'Rahima Begum', start: '2026-04-19T18:00:00', end: '2026-04-19T18:20:00', type: 'follow-up', status: 'confirmed', chamberId: 'ch-1', note: 'Review CBC + CXR reports' },
  { id: 'a-2', patientId: 'pai-00301', patientName: 'Mohammad Faisal', start: '2026-04-19T18:30:00', end: '2026-04-19T18:50:00', type: 'consultation', status: 'confirmed', chamberId: 'ch-1' },
  { id: 'a-3', patientId: 'pai-00355', patientName: 'Abdur Rahman', start: '2026-04-19T19:00:00', end: '2026-04-19T19:30:00', type: 'follow-up', status: 'scheduled', chamberId: 'ch-1' },
  { id: 'a-4', patientId: 'pai-00322', patientName: 'Nusrat Jahan', start: '2026-04-20T18:00:00', end: '2026-04-20T18:20:00', type: 'tele', status: 'confirmed', chamberId: 'ch-1', joinToken: 'nus-4Uq9x2kP' },
  { id: 'a-5', patientId: 'pai-00402', patientName: 'Sumaiya Akter', start: '2026-04-20T18:30:00', end: '2026-04-20T18:50:00', type: 'consultation', status: 'confirmed', chamberId: 'ch-1' },
  { id: 'a-6', patientId: 'pai-00418', patientName: 'Shahidul Islam', start: '2026-04-21T17:00:00', end: '2026-04-21T17:20:00', type: 'follow-up', status: 'scheduled', chamberId: 'ch-2' },
  { id: 'a-7', patientId: 'pai-00284', patientName: 'Rahima Begum', start: '2026-04-23T18:00:00', end: '2026-04-23T18:20:00', type: 'follow-up', status: 'scheduled', chamberId: 'ch-1' },
  { id: 'a-8', patientId: 'pai-00355', patientName: 'Abdur Rahman', start: '2026-04-22T18:30:00', end: '2026-04-22T18:50:00', type: 'tele', status: 'scheduled', chamberId: 'ch-2', joinToken: 'abd-78sKwLm3' },
  {
    id: 'a-surg-1',
    patientId: 'pai-00355',
    patientName: 'Abdur Rahman',
    start: '2026-04-28T08:00:00',
    end: '2026-04-28T12:00:00',
    type: 'surgery',
    status: 'confirmed',
    chamberId: 'ch-2',
    surgicalPlanId: 'sp-1',
    hospital: 'Square Hospital · OT-3',
    procedure: 'CABG — triple vessel bypass',
    expectedDurationMin: 240,
    note: 'Pre-op clearance complete. Fasting from midnight.',
  },
];

export const labIntake: LabIntake[] = [
  {
    id: 'li-1',
    filename: 'rahima_cbc_18apr.pdf',
    mime: 'application/pdf',
    sizeKb: 284,
    pages: 2,
    uploadedAt: '2026-04-19T08:11:00',
    uploadedBy: 'Reception · Popular',
    status: 'routed',
    extracted: {
      patientName: 'Rahima Begum',
      patientId: 'PAI-00284',
      testName: 'CBC with ESR',
      labName: 'Popular Diagnostic · Dhanmondi',
      collectionDate: '2026-04-18',
      summary:
        'Haemoglobin 11.8 g/dL · Total WBC 12,400/µL with neutrophilic predominance · ESR 48 mm/1st hr — findings consistent with an active bacterial infection.',
    },
    suggestion: {
      patientId: 'pai-00284',
      patientName: 'Rahima Begum',
      testId: 'lab-1',
      testName: 'CBC with ESR',
      confidence: 0.97,
      reason: 'Name, patient ID & ordered test all matched.',
    },
    routed: {
      patientId: 'pai-00284',
      patientName: 'Rahima Begum',
      testId: 'lab-1',
      testName: 'CBC with ESR',
      labId: 'lab-1',
      at: '2026-04-19T08:11:14',
    },
  },
  {
    id: 'li-2',
    filename: 'CXR_rahima_18apr.jpg',
    mime: 'image/jpeg',
    sizeKb: 1190,
    pages: 1,
    uploadedAt: '2026-04-19T08:15:40',
    uploadedBy: 'Reception · Popular',
    status: 'routed',
    extracted: {
      patientName: 'Rahima Begum',
      patientId: 'PAI-00284',
      testName: 'Chest X-ray PA view',
      labName: 'Popular Diagnostic · Dhanmondi',
      collectionDate: '2026-04-18',
      summary:
        'Mildly increased bronchovascular markings in both lung fields. No consolidation or pleural effusion.',
    },
    suggestion: {
      patientId: 'pai-00284',
      patientName: 'Rahima Begum',
      testId: 'lab-3',
      testName: 'Chest X-ray PA view',
      confidence: 0.93,
      reason: 'Filename + header text match.',
    },
    routed: {
      patientId: 'pai-00284',
      patientName: 'Rahima Begum',
      testId: 'lab-3',
      testName: 'Chest X-ray PA view',
      labId: 'lab-3',
      at: '2026-04-19T08:15:52',
    },
  },
  {
    id: 'li-3',
    filename: 'HbA1c_S_Creatinine.pdf',
    mime: 'application/pdf',
    sizeKb: 212,
    pages: 1,
    uploadedAt: '2026-04-19T08:42:00',
    uploadedBy: 'Lab · Square',
    status: 'needs_review',
    extracted: {
      patientName: 'Rahima B.',
      testName: 'HbA1c · S. Creatinine',
      labName: 'Square Diagnostics',
      collectionDate: '2026-04-17',
      summary: 'HbA1c 7.2% · S. Creatinine 1.1 mg/dL · eGFR 62 mL/min/1.73m².',
    },
    suggestion: {
      patientId: 'pai-00284',
      patientName: 'Rahima Begum',
      testId: 'lab-4',
      testName: 'HbA1c, S. Creatinine',
      confidence: 0.71,
      reason: 'Partial name match. Patient ID not printed on the report.',
    },
  },
  {
    id: 'li-4',
    filename: 'scan_0017.jpg',
    mime: 'image/jpeg',
    sizeKb: 820,
    pages: 1,
    uploadedAt: '2026-04-19T08:55:12',
    uploadedBy: 'WhatsApp · Dr. Ashraful',
    status: 'needs_review',
    extracted: {
      patientName: 'M. Faisal',
      testName: 'Lipid profile',
      labName: 'Popular Diagnostic',
      collectionDate: '2026-04-15',
      summary: 'TC 214 mg/dL · LDL 132 · HDL 38 · TG 198 — mild dyslipidemia.',
    },
    suggestion: {
      patientId: 'pai-00301',
      patientName: 'Mohammad Faisal',
      confidence: 0.64,
      reason: 'Name partially matches. No linked pending test for this patient.',
    },
  },
  {
    id: 'li-5',
    filename: 'urine_rme_cs_rahima.pdf',
    mime: 'application/pdf',
    sizeKb: 168,
    pages: 2,
    uploadedAt: '2026-04-19T09:02:00',
    uploadedBy: 'Reception · Popular',
    status: 'processing',
    extracted: {},
  },
  {
    id: 'li-6',
    filename: 'IMG_20260419_0912.jpg',
    mime: 'image/jpeg',
    sizeKb: 2340,
    pages: 1,
    uploadedAt: '2026-04-19T09:14:20',
    uploadedBy: 'Upload by email',
    status: 'unidentified',
    extracted: {
      testName: 'CBC',
      collectionDate: '2026-04-18',
      summary: 'Handwritten report. Patient identifier unclear.',
    },
  },
  {
    id: 'li-7',
    filename: 'abdur_ecg_12lead.pdf',
    mime: 'application/pdf',
    sizeKb: 306,
    pages: 3,
    uploadedAt: '2026-04-18T17:40:00',
    uploadedBy: 'Reception · Square',
    status: 'routed',
    extracted: {
      patientName: 'Abdur Rahman',
      patientId: 'PAI-00355',
      testName: '12-lead ECG',
      labName: 'Square Hospital',
      collectionDate: '2026-04-18',
      summary:
        'Sinus rhythm at 76 bpm. Borderline ST depression in V4-V6 — correlate clinically.',
    },
    suggestion: {
      patientId: 'pai-00355',
      patientName: 'Abdur Rahman',
      confidence: 0.95,
      reason: 'Name and patient ID match exactly.',
    },
    routed: {
      patientId: 'pai-00355',
      patientName: 'Abdur Rahman',
      at: '2026-04-18T17:40:12',
    },
  },
  {
    id: 'li-8',
    filename: 'unknown_scan.pdf',
    mime: 'application/pdf',
    sizeKb: 540,
    pages: 1,
    uploadedAt: '2026-04-19T07:02:00',
    uploadedBy: 'Upload by email',
    status: 'unidentified',
    extracted: {
      summary: 'AI could not read any patient or test identifier on this page.',
    },
  },
];

export const currentTeam: Team = {
  id: 'team-001',
  name: "Dr. Ashraful's Clinic",
  ownerId: currentDoctor.id,
  createdAt: '2023-08-14T09:00:00',
};

export const teamMembers: TeamMember[] = [
  {
    id: 'mem-1',
    teamId: currentTeam.id,
    userId: currentDoctor.id,
    name: currentDoctor.name,
    email: currentDoctor.email,
    phone: currentDoctor.phone,
    role: 'admin',
    status: 'active',
    joinedAt: currentTeam.createdAt,
    isOwner: true,
  },
  {
    id: 'mem-2',
    teamId: currentTeam.id,
    userId: 'u-assistant-1',
    name: 'Samira Khan',
    email: 'samira.khan@prescriptionai.bd',
    phone: '+880 1711-222 333',
    role: 'assistant',
    status: 'active',
    joinedAt: '2024-03-05T10:30:00',
    isOwner: false,
  },
  {
    id: 'mem-3',
    teamId: currentTeam.id,
    userId: 'u-assistant-2',
    name: 'Rafiul Hasan',
    email: 'rafiul.hasan@prescriptionai.bd',
    phone: '+880 1811-555 012',
    role: 'assistant',
    status: 'active',
    joinedAt: '2025-09-22T14:10:00',
    isOwner: false,
  },
];

export const teamInvites: Invite[] = [
  {
    id: 'inv-1',
    teamId: currentTeam.id,
    email: 'nabila.ahsan@example.com',
    role: 'assistant',
    status: 'pending',
    invitedBy: currentDoctor.id,
    invitedByName: currentDoctor.name,
    token: 'demo-invite-TqP2x9Lm',
    createdAt: '2026-04-17T11:00:00',
    expiresAt: '2026-04-24T11:00:00',
  },
];

export const consultScript: ConsultTurn[] = [
  { id: 'c-1', who: 'doctor', text: 'Assalamu alaikum. How are you feeling today?', textBn: 'আসসালামু আলাইকুম। আজ কেমন লাগছে?' },
  { id: 'c-2', who: 'patient', text: "I've had a cough for about five days now, it won't stop. And a little fever at night.", textBn: 'পাঁচ দিন ধরে কাশি হচ্ছে, থামছেই না। রাতে একটু জ্বরও আসে।' },
  { id: 'c-3', who: 'doctor', text: 'Any phlegm? Chest pain while coughing?', textBn: 'কফ আসে? কাশতে গেলে বুকে ব্যথা হয়?' },
  { id: 'c-4', who: 'patient', text: 'Yes, yellowish phlegm. And sometimes burning while passing urine since two days.', textBn: 'জ্বি, হলুদ কফ। আর দুই দিন ধরে প্রস্রাবে জ্বালাপোড়া হচ্ছে।' },
  { id: 'c-5', who: 'doctor', text: "Alright. We'll need a CBC with ESR and a urine culture. Let me listen to your chest.", textBn: 'ঠিক আছে। CBC আর urine C/S করাতে হবে। বুকটা একটু পরীক্ষা করি।' },
  { id: 'c-6', who: 'patient', text: 'My pressure was 140/90 this morning at the pharmacy.', textBn: 'আজ সকালে ফার্মেসিতে প্রেশার ১৪০/৯০ ছিল।' },
  { id: 'c-7', who: 'doctor', text: "We'll adjust your Amdocal and add an antibiotic for the infection. No heavy salt, drink warm water.", textBn: 'Amdocal সামান্য অ্যাডজাস্ট করব আর একটা অ্যান্টিবায়োটিক যোগ করব। লবণ কম, গরম পানি বেশি।' },
];
