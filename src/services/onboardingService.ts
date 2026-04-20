import { apiGet, apiPost, apiPut } from '../lib/http';
import type {
  Availability,
  Chamber,
  Doctor,
  DoctorPreferences,
  Subscription,
} from '../types';

export interface SaveProfileRequest {
  name: string;
  nameBn?: string;
  bmdcNo: string;
  specialty: string;
  degrees: string[];
  phone: string;
  email: string;
  signatureUrl?: string;
}

export type ChamberDraft = Omit<Chamber, 'id'> & { id?: string };

export interface SaveChambersRequest {
  chambers: ChamberDraft[];
}

export interface SaveAvailabilityRequest {
  availability: Availability;
}

export interface SavePreferencesRequest {
  preferences: DoctorPreferences;
}

export interface CheckoutRequest {
  planId: 'starter' | 'pro' | 'clinic';
  cycle: 'monthly' | 'yearly';
  /** "card" / "bkash" / "nagad" — server only validates presence in mock. */
  method: string;
}

export interface SkipStepResponse {
  doctor: Doctor;
}

/**
 * Onboarding writes always echo the updated `Doctor` back, with the new
 * `onboardingStep`/`onboardingComplete`/`subscription` so the auth store
 * mirrors it without a separate refetch.
 */
export const onboardingService = {
  getAvailability: () => apiGet<Availability>('/doctor/availability'),

  saveProfile: (body: SaveProfileRequest) =>
    apiPut<Doctor, SaveProfileRequest>('/onboarding/profile', body),

  saveChambers: (body: SaveChambersRequest) =>
    apiPut<Doctor, SaveChambersRequest>('/onboarding/chambers', body),

  saveAvailability: (body: SaveAvailabilityRequest) =>
    apiPut<Doctor, SaveAvailabilityRequest>('/onboarding/availability', body),

  savePreferences: (body: SavePreferencesRequest) =>
    apiPut<Doctor, SavePreferencesRequest>('/onboarding/preferences', body),

  /** Used for steps the doctor chose to skip — server still advances the cursor. */
  skipStep: (step: 'preferences' | 'team') =>
    apiPost<Doctor, { step: typeof step }>('/onboarding/skip', { step }),

  /** Subscription checkout — returns updated doctor with the new subscription. */
  checkout: (body: CheckoutRequest) =>
    apiPost<{ doctor: Doctor; subscription: Subscription }, CheckoutRequest>(
      '/onboarding/checkout',
      body
    ),

  /** Marks onboarding complete (used after team / payment finishes). */
  finish: () => apiPost<Doctor, Record<string, never>>('/onboarding/finish', {}),
};
