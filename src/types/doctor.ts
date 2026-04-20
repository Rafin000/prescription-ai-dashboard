import type { TeamRole } from '../lib/permissions';

export type OnboardingStep =
  | 'profile'
  | 'chambers'
  | 'availability'
  | 'preferences'
  | 'team'
  | 'payment'
  | 'done';

export type SubscriptionStatus =
  | 'none'
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'cancelled';

export type BillingCycle = 'monthly' | 'yearly';

export interface Subscription {
  status: SubscriptionStatus;
  planId?: 'starter' | 'pro' | 'clinic';
  cycle?: BillingCycle;
  trialEndsAt?: string;
  renewsAt?: string;
  /** What we'll bill them — used for the receipt. */
  amountBdt?: number;
  /**
   * When cancelled by the user, we keep the subscription active until this
   * date (end of current cycle). Null/undefined means no pending cancellation.
   */
  cancelAt?: string;
  /** Last SSLCommerz transaction id, used to reconcile invoices. */
  lastTranId?: string;
}

/** The kind of AI usage that ends up on the customer's bill. */
export type UsageKind =
  | 'transcription'
  | 'ai-fill'
  | 'talk-to-ai'
  | 'summary'
  | 'other';

export const USAGE_KIND_LABEL: Record<UsageKind, string> = {
  transcription: 'Live transcription',
  'ai-fill': 'Rx auto-fill',
  'talk-to-ai': 'Talk-to-AI commands',
  summary: 'Visit summaries',
  other: 'Other',
};

/** Per-thousand-token rates (৳/1K tokens) — keeps arithmetic predictable. */
export const USAGE_RATES_BDT: Record<UsageKind, number> = {
  transcription: 0.8,
  'ai-fill': 1.2,
  'talk-to-ai': 1.5,
  summary: 1.0,
  other: 1.0,
};

/** A single metered AI interaction that contributes to the next invoice. */
export interface UsageEvent {
  id: string;
  at: string;
  kind: UsageKind;
  /** Totals in *input* + *output* tokens — billed on the sum. */
  tokens: number;
  /** Convenience: tokens × rate, computed server-side so clients agree. */
  costBdt: number;
  /** Optional provenance so the doctor can see where a charge came from. */
  sessionId?: string;
  patientId?: string;
  patientName?: string;
  /** Free-form label, e.g. "Transcribed 14 min of call". */
  summary?: string;
}

/** Aggregates for a billing period — drives the Usage page cards. */
export interface UsageSummary {
  periodStart: string;
  periodEnd: string;
  totalTokens: number;
  totalCostBdt: number;
  eventsCount: number;
  /** Keyed by UsageKind → { tokens, costBdt }. */
  byKind: Record<UsageKind, { tokens: number; costBdt: number }>;
  /** Daily buckets (ISO date → token total) — for the small line chart. */
  daily: Array<{ date: string; tokens: number; costBdt: number }>;
}

/** One line on a paid invoice — either the base subscription or usage. */
export interface InvoiceLineItem {
  id: string;
  kind: 'subscription' | 'usage';
  label: string;
  /** Optional sub-kind so the UI can render a specific icon/pill. */
  usageKind?: UsageKind;
  /** e.g. tokens consumed. Omit for subscription lines. */
  quantity?: number;
  quantityUnit?: string;
  /** Per-unit rate, in BDT. Stored with the line for receipt fidelity. */
  unitPriceBdt?: number;
  amountBdt: number;
}

/** One billable event — subscription renewal + whatever usage accrued. */
export interface Invoice {
  id: string;
  /** SSLCommerz transaction id from the gateway. */
  tranId: string;
  planId: 'starter' | 'pro' | 'clinic';
  cycle: BillingCycle;
  /** Sum of every lineItems[].amountBdt — display total. */
  amountBdt: number;
  /** Historical split — filled even on older flat-rate invoices. */
  lineItems: InvoiceLineItem[];
  /** Subtotals for the summary card. */
  subscriptionBdt: number;
  usageBdt: number;
  /** Payment method picked on SSLCommerz (card / bkash / nagad / rocket). */
  method?: string;
  /** Card BIN / bKash number fingerprint — display only. */
  methodHint?: string;
  status: 'paid' | 'failed' | 'cancelled' | 'refunded' | 'upcoming';
  createdAt: string;
  /** ISO — when the subscription period paid for starts. */
  periodStart: string;
  /** ISO — when it ends. */
  periodEnd: string;
  receiptUrl?: string;
}

export interface DoctorPreferences {
  /** Default Rx language used by the live consult / video call. */
  rxLanguage?: 'bn' | 'en' | 'bilingual';
  /** Minutes — used to suggest end times when booking appointments. */
  defaultAppointmentMinutes?: number;
  /** Free-form footer printed under each Rx (clinic phone, payment hints). */
  rxFooter?: string;
}

export interface Doctor {
  id: string;
  name: string;
  nameBn?: string;
  degrees: string[];
  specialty: string;
  /** Sub-specialties — surfaced on the public listing. */
  focusAreas?: string[];
  bmdcNo: string;
  phone: string;
  email: string;
  avatarUrl?: string;
  chambers: Chamber[];
  signatureUrl?: string;
  /** Public-listing metadata — only filled when the doctor opted into the
   *  patient-facing directory at sign-up. */
  yearsOfExperience?: number;
  languages?: string[];
  tagline?: string;
  bio?: string;
  rating?: number;
  reviewCount?: number;
  feeBdt?: number;
  /** True if patients can request an appointment from the public site. */
  acceptingNewPatients?: boolean;
  /** Tele-consultation availability — surfaces a "Video call" badge. */
  offersTele?: boolean;
  /** Role in the active team. Defaults to 'admin' when the user owns the workspace. */
  role: TeamRole;
  /** The team this user is currently acting within. */
  teamId: string;
  /**
   * True when this user is the workspace owner (the doctor whose practice
   * the team operates in). False for invited members. Drives whether the
   * heavy onboarding flow + billing gate apply.
   */
  isOwner: boolean;
  /** Where the doctor currently is in the onboarding flow. */
  onboardingStep: OnboardingStep;
  /** True once the doctor has completed (or skipped past) every step. */
  onboardingComplete: boolean;
  /** Subscription state. Until this is 'active' or 'trialing' the app shell is gated. */
  subscription: Subscription;
  preferences?: DoctorPreferences;
}

/** A single weekly availability slot — used by both in-person & video-call grids. */
export interface AvailabilitySlot {
  /** ISO weekday, 0 = Sunday … 6 = Saturday (matches JS getDay()). */
  weekday: number;
  /** "HH:mm" 24h. */
  start: string;
  end: string;
}

export interface Availability {
  /** Per-chamber in-person slots, keyed by chamber id. */
  inPerson: Record<string, AvailabilitySlot[]>;
  /** Tele-consult slots — chamber-agnostic. */
  video: AvailabilitySlot[];
}

export interface Chamber {
  id: string;
  name: string;
  address: string;
  phone?: string;
  days: string[];
  time: string;
  /** Optional structured weekly slots — preferred over the legacy days/time. */
  slots?: AvailabilitySlot[];
  /** Public-facing geo so the discovery map can drop a marker. */
  lat?: number;
  lng?: number;
  area?: string;
  city?: string;
}
