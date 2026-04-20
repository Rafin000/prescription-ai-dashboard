import { apiGet } from '../lib/http';
import type { Invoice, UsageEvent, UsageKind, UsageSummary } from '../types';

export interface ListUsageParams {
  /** ISO — inclusive. Defaults to the current billing period start. */
  from?: string;
  /** ISO — inclusive. Defaults to now. */
  to?: string;
  /** Optional filter. */
  kind?: UsageKind;
  /** Max rows (server also caps). */
  limit?: number;
}

export const usageService = {
  /** Aggregated numbers for the current billing period. */
  getSummary: () => apiGet<UsageSummary>('/usage/summary'),

  /** Raw event log — drives the table on the Usage page. */
  listEvents: (params?: ListUsageParams) =>
    apiGet<UsageEvent[]>('/usage/events', { params }),

  /**
   * Mock of SSLCommerz's upcoming-bill preview: subscription renewal +
   * whatever usage has accrued this cycle. The server returns an `Invoice`
   * with `status: 'upcoming'` so the UI can reuse the same row component.
   */
  getUpcomingInvoice: () => apiGet<Invoice>('/billing/upcoming'),
};
