import { apiGet, apiPost } from '../lib/http';
import type { Doctor, Invoice, Subscription } from '../types';

export interface InitiateCheckoutRequest {
  planId: 'starter' | 'pro' | 'clinic';
  cycle: 'monthly' | 'yearly';
  /** Where SSLCommerz should redirect after success/fail/cancel. */
  successUrl: string;
  failUrl: string;
  cancelUrl: string;
}

export interface InitiateCheckoutResponse {
  /**
   * Hosted-checkout URL returned by SSLCommerz — in production this is their
   * `GatewayPageURL`. The client just redirects `window.location = gatewayUrl`.
   */
  gatewayUrl: string;
  /** SSLCommerz transaction id — used later for validation + reconciliation. */
  tranId: string;
  /** Short-lived session id we echo back when verifying. */
  sessionKey: string;
  amountBdt: number;
}

export interface VerifyCheckoutRequest {
  tranId: string;
}

export interface VerifyCheckoutResponse {
  doctor: Doctor;
  subscription: Subscription;
  invoice: Invoice;
}

export interface ChangePlanRequest {
  planId: 'starter' | 'pro' | 'clinic';
  cycle: 'monthly' | 'yearly';
  /** Same redirect URLs — changing plan also goes through SSLCommerz. */
  successUrl: string;
  failUrl: string;
  cancelUrl: string;
}

/**
 * All payment traffic goes through SSLCommerz's hosted checkout — we never
 * see card / bKash / Nagad details on our side. Our backend is responsible
 * for initiating the session (with store_id + store_passwd), then validating
 * each completed transaction against SSLCommerz's validation API before
 * flipping the subscription.
 */
export const billingService = {
  initiateCheckout: (body: InitiateCheckoutRequest) =>
    apiPost<InitiateCheckoutResponse, InitiateCheckoutRequest>(
      '/billing/sslcz/initiate',
      body
    ),

  verifyCheckout: (body: VerifyCheckoutRequest) =>
    apiPost<VerifyCheckoutResponse, VerifyCheckoutRequest>(
      '/billing/sslcz/verify',
      body
    ),

  listInvoices: () => apiGet<Invoice[]>('/billing/invoices'),

  cancelSubscription: () =>
    apiPost<{ doctor: Doctor; subscription: Subscription }, Record<string, never>>(
      '/billing/cancel',
      {}
    ),

  resumeSubscription: () =>
    apiPost<{ doctor: Doctor; subscription: Subscription }, Record<string, never>>(
      '/billing/resume',
      {}
    ),

  changePlan: (body: ChangePlanRequest) =>
    apiPost<InitiateCheckoutResponse, ChangePlanRequest>(
      '/billing/change-plan',
      body
    ),
};
