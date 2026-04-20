import { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowUpRight,
  Calendar,
  ChevronDown,
  CreditCard,
  Download,
  FileText,
  RotateCcw,
  Shield,
  Wallet,
} from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { OnboardingPayment } from './onboarding/OnboardingPayment';
import { useAuthStore } from '../stores/authStore';
import {
  useCancelSubscription,
  useInvoices,
  useResumeSubscription,
  useUpcomingInvoice,
  useUsageSummary,
} from '../queries/hooks';
import type { Invoice, InvoiceLineItem, SubscriptionStatus } from '../types';
import { cn } from '../lib/cn';

const PLAN_LABEL: Record<'starter' | 'pro' | 'clinic', string> = {
  starter: 'Starter',
  pro: 'Pro',
  clinic: 'Clinic',
};

const STATUS_TONE: Record<SubscriptionStatus, 'success' | 'warn' | 'danger' | 'neutral'> = {
  active: 'success',
  trialing: 'success',
  past_due: 'warn',
  cancelled: 'danger',
  none: 'neutral',
};

/**
 * Single billing surface — shows subscription + upcoming bill + invoice
 * history. When the subscription has lapsed it also renders the plan
 * picker inline (same component used during onboarding) so the doctor can
 * re-subscribe without leaving the page.
 */
export function Billing() {
  const user = useAuthStore((s) => s.user);
  const location = useLocation() as { state?: { toast?: string } };
  const navigate = useNavigate();
  const { data: invoices = [], isLoading: invLoading } = useInvoices();
  const { data: upcoming } = useUpcomingInvoice();
  const { data: usage } = useUsageSummary();
  const cancel = useCancelSubscription();
  const resume = useResumeSubscription();

  const [confirmCancel, setConfirmCancel] = useState(false);
  const [showRepick, setShowRepick] = useState(false);

  const sub = user?.subscription;
  const status = sub?.status ?? 'none';
  const pendingCancel = !!sub?.cancelAt;
  const subscribed = status === 'active' || status === 'trialing';

  const paidInvoices = useMemo(
    () => invoices.filter((i) => i.status !== 'upcoming'),
    [invoices]
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Billing"
        description="Your subscription, this cycle's usage accrual, and every receipt SSLCommerz has issued so far."
      />

      {location.state?.toast && (
        <div className="inline-flex items-center gap-2 rounded-md bg-success-soft border border-success/30 text-success px-3 py-2 text-[12.5px] font-medium animate-fade-in">
          {location.state.toast}
        </div>
      )}

      {/* Paywall banner — only when subscription has actually lapsed. */}
      {!subscribed && (
        <Card className="border-warn/40 bg-warn-soft/60">
          <div className="p-4 flex items-start gap-3 flex-wrap">
            <div className="h-9 w-9 rounded-md bg-warn text-white grid place-items-center shrink-0">
              <AlertTriangle className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-[220px]">
              <div className="font-serif text-[15px] font-semibold text-ink">
                {status === 'past_due'
                  ? 'Your last payment failed.'
                  : status === 'cancelled'
                  ? 'Subscription cancelled.'
                  : 'No active subscription.'}
              </div>
              <p className="text-[12.5px] text-ink-2 mt-0.5">
                Pick a plan below to unlock live consultations, video calls,
                and the rest of the app.
              </p>
            </div>
            <Button variant="primary" onClick={() => setShowRepick(true)}>
              Pick a plan
            </Button>
          </div>

          {showRepick && (
            <div className="border-t border-warn/30 bg-surface p-5">
              <OnboardingPayment
                context="billing"
                successPath="/billing/success"
                failPath="/billing/failed"
                cancelPath="/billing/cancelled"
              />
            </div>
          )}
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-5">
        {/* Subscription summary */}
        <Card>
          <div className="p-5 flex flex-col gap-3">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <div className="text-[10.5px] font-bold uppercase tracking-[1.4px] text-ink-3">
                  Current plan
                </div>
                <div className="font-serif text-[26px] font-semibold text-ink mt-1 leading-tight">
                  {sub?.planId ? PLAN_LABEL[sub.planId] : 'No active plan'}
                  <span className="text-[14px] text-ink-3 ml-2 font-normal capitalize">
                    {sub?.cycle ?? ''}
                  </span>
                </div>
                <div className="text-[13px] text-ink-2 mt-1">
                  {sub?.amountBdt
                    ? `৳${sub.amountBdt.toLocaleString()} base · ${sub.cycle === 'yearly' ? 'per year' : 'per month'}`
                    : 'Set up a plan to get started.'}
                </div>
              </div>
              <Badge tone={STATUS_TONE[status]} variant="soft" uppercase>
                {pendingCancel ? 'cancelling' : status.replace('_', ' ')}
              </Badge>
            </div>

            <div className="border-t border-line pt-3 text-[12.5px] text-ink-2 space-y-2">
              {pendingCancel ? (
                <div className="inline-flex items-start gap-2 text-warn">
                  <AlertTriangle className="h-3.5 w-3.5 mt-0.5" />
                  <span>
                    Access ends on <b>{fmt(sub!.cancelAt!)}</b>. Hit Resume any
                    time to keep your workspace.
                  </span>
                </div>
              ) : sub?.renewsAt ? (
                <div className="inline-flex items-center gap-2">
                  <Calendar className="h-3.5 w-3.5 text-ink-3" />
                  Renews on <b className="text-ink">{fmt(sub.renewsAt)}</b>
                </div>
              ) : null}
              {sub?.lastTranId && (
                <div className="text-[11.5px] text-ink-3 font-mono">
                  Last transaction · {sub.lastTranId}
                </div>
              )}
              <div className="text-[11.5px] text-ink-3 inline-flex items-center gap-1.5">
                <Shield className="h-3 w-3 text-success" />
                Payments processed by SSLCommerz · PCI-DSS Level 1
              </div>
            </div>

            <div className="pt-1 flex items-center gap-2 flex-wrap">
              {subscribed && (
                <Button
                  variant="secondary"
                  size="sm"
                  leftIcon={<CreditCard />}
                  onClick={() => setShowRepick((v) => !v)}
                >
                  {showRepick ? 'Hide plan picker' : 'Change plan'}
                </Button>
              )}
              {pendingCancel ? (
                <Button
                  variant="ghost"
                  size="sm"
                  leftIcon={<RotateCcw />}
                  loading={resume.isPending}
                  onClick={() => resume.mutateAsync()}
                >
                  Resume subscription
                </Button>
              ) : (
                subscribed && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setConfirmCancel(true)}
                  >
                    Cancel subscription
                  </Button>
                )
              )}
              <Button
                variant="ghost"
                size="sm"
                rightIcon={<ArrowUpRight />}
                onClick={() => navigate('/usage')}
              >
                See usage details
              </Button>
            </div>

            {showRepick && subscribed && (
              <div className="mt-3 pt-4 border-t border-line">
                <OnboardingPayment
                  context="change-plan"
                  successPath="/billing/success"
                  failPath="/billing/failed"
                  cancelPath="/billing/cancelled"
                />
              </div>
            )}
          </div>
        </Card>

        {/* Upcoming bill preview */}
        <Card>
          <div className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="inline-flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[1.4px] text-accent-ink">
                <Wallet className="h-3 w-3" />
                Upcoming bill
              </div>
              {upcoming?.periodEnd && (
                <span className="text-[11px] text-ink-3 font-mono">
                  due {fmt(upcoming.periodEnd)}
                </span>
              )}
            </div>

            {upcoming ? (
              <>
                <div className="flex items-baseline gap-1.5 mb-3">
                  <span className="font-serif text-[28px] font-semibold text-ink">
                    ৳{upcoming.amountBdt.toLocaleString()}
                  </span>
                  <span className="text-[12px] text-ink-3">so far this cycle</span>
                </div>
                <div className="flex flex-col gap-2">
                  <BreakdownRow
                    label="Base subscription"
                    value={upcoming.subscriptionBdt}
                  />
                  <BreakdownRow
                    label="AI token usage"
                    value={upcoming.usageBdt}
                    hint={usage ? `${usage.totalTokens.toLocaleString()} tokens, ${usage.eventsCount} events` : undefined}
                  />
                </div>
                <div className="mt-3 text-[11px] text-ink-3 leading-relaxed">
                  Usage is metered in real time — every live consult, video
                  call, AI auto-fill, and Talk-to-AI command adds to this
                  total. Bills settle via SSLCommerz on the renewal date.
                </div>
              </>
            ) : (
              <div className="text-[12.5px] text-ink-3">
                Your next bill will appear here once the billing period begins.
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Invoice history */}
      <Card>
        <div className="px-5 py-4 border-b border-line flex items-center justify-between">
          <div className="inline-flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[1.4px] text-accent-ink">
            <FileText className="h-3 w-3" />
            Invoice history
          </div>
          <span className="text-[11.5px] text-ink-3 font-mono">
            {paidInvoices.length} invoice{paidInvoices.length === 1 ? '' : 's'}
          </span>
        </div>
        <div className="divide-y divide-line">
          {invLoading && (
            <div className="px-5 py-8 text-center text-[12.5px] text-ink-3">
              Loading invoices…
            </div>
          )}
          {!invLoading && paidInvoices.length === 0 && (
            <div className="px-5 py-8 text-center text-[12.5px] text-ink-3">
              No invoices yet — they'll appear here after your first billing cycle.
            </div>
          )}
          {paidInvoices.map((inv) => (
            <InvoiceAccordion key={inv.id} invoice={inv} />
          ))}
        </div>
      </Card>

      <Modal
        open={confirmCancel}
        onClose={() => setConfirmCancel(false)}
        size="sm"
        title="Cancel subscription?"
        description="You'll keep access until the end of your current billing cycle. Patients and appointments won't be affected."
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => setConfirmCancel(false)}
              disabled={cancel.isPending}
            >
              Keep subscription
            </Button>
            <Button
              variant="danger"
              loading={cancel.isPending}
              onClick={async () => {
                await cancel.mutateAsync();
                setConfirmCancel(false);
              }}
            >
              Cancel at period end
            </Button>
          </>
        }
      >
        <div className="text-[12.5px] text-ink-2">
          Your subscription will stop renewing. You can resume anytime before
          {sub?.renewsAt ? ` ${fmt(sub.renewsAt)}` : ' the end of the cycle'} and keep
          your workspace intact.
        </div>
      </Modal>
    </div>
  );
}

function InvoiceAccordion({ invoice }: { invoice: Invoice }) {
  const [open, setOpen] = useState(false);
  const tone =
    invoice.status === 'paid'
      ? 'success'
      : invoice.status === 'failed'
      ? 'danger'
      : invoice.status === 'cancelled'
      ? 'neutral'
      : 'warn';
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full text-left px-5 py-3.5 grid grid-cols-[160px_1fr_120px_120px_24px] gap-4 items-center hover:bg-bg-muted transition-colors"
      >
        <div>
          <div className="font-serif text-[14px] font-semibold text-ink">
            {fmt(invoice.createdAt)}
          </div>
          <div className="text-[10.5px] text-ink-3 font-mono mt-0.5 truncate">
            {invoice.tranId}
          </div>
        </div>
        <div className="min-w-0">
          <div className="text-[13px] text-ink font-medium">
            {invoice.planId ? `${invoice.planId[0].toUpperCase()}${invoice.planId.slice(1)}` : '—'}
            {' · '}
            <span className="capitalize text-ink-2">{invoice.cycle}</span>
          </div>
          <div className="text-[11.5px] text-ink-3 mt-0.5">
            ৳{invoice.subscriptionBdt.toLocaleString()} base + ৳{invoice.usageBdt.toLocaleString()} usage
            {invoice.method && <> · {invoice.method}</>}
          </div>
        </div>
        <Badge tone={tone} variant="soft" uppercase>
          {invoice.status}
        </Badge>
        <div className="text-right font-serif text-[16px] font-semibold text-ink">
          ৳{invoice.amountBdt.toLocaleString()}
        </div>
        <ChevronDown
          className={cn('h-4 w-4 text-ink-3 transition-transform', open && 'rotate-180')}
        />
      </button>

      {open && (
        <div className="px-5 pb-5 bg-surface-muted/50">
          <div className="rounded-md border border-line bg-surface">
            <div className="grid grid-cols-[1fr_120px_120px_120px] gap-2 px-4 py-2.5 border-b border-line text-[10px] font-bold uppercase tracking-[1.2px] text-ink-3">
              <div>Item</div>
              <div className="text-right">Qty</div>
              <div className="text-right">Rate</div>
              <div className="text-right">Amount</div>
            </div>
            <div className="divide-y divide-line">
              {invoice.lineItems.map((li) => (
                <LineRow key={li.id} item={li} />
              ))}
            </div>
            <div className="grid grid-cols-[1fr_120px] gap-2 px-4 py-3 border-t border-line items-baseline">
              <div className="text-[11.5px] font-semibold text-ink-2">Total</div>
              <div className="text-right font-serif text-[18px] font-semibold text-ink">
                ৳{invoice.amountBdt.toLocaleString()}
              </div>
            </div>
          </div>
          {invoice.receiptUrl && invoice.status === 'paid' && (
            <div className="mt-3 flex justify-end">
              <a
                href={invoice.receiptUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md border border-line bg-surface text-[12px] font-semibold text-ink-2 hover:border-line-strong hover:bg-bg-muted hover:text-ink"
              >
                <Download className="h-3 w-3" />
                Download receipt
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function LineRow({ item }: { item: InvoiceLineItem }) {
  return (
    <div className="grid grid-cols-[1fr_120px_120px_120px] gap-2 px-4 py-2.5 items-center">
      <div className="text-[12.5px] text-ink">
        <span className="font-medium">{item.label}</span>
        {item.kind === 'usage' && item.usageKind && (
          <span className="ml-2 text-[10px] font-bold uppercase tracking-[1.2px] text-ink-3 bg-bg-muted rounded-xs px-1.5 py-[1px]">
            usage
          </span>
        )}
      </div>
      <div className="text-right text-[11.5px] text-ink-2 font-mono">
        {item.quantity ? item.quantity.toLocaleString() : '—'}
      </div>
      <div className="text-right text-[11.5px] text-ink-2 font-mono">
        {item.unitPriceBdt
          ? `৳${item.unitPriceBdt} / 1K ${item.quantityUnit ?? ''}`
          : '—'}
      </div>
      <div className="text-right text-[13px] font-semibold text-ink">
        ৳{item.amountBdt.toLocaleString()}
      </div>
    </div>
  );
}

function BreakdownRow({
  label,
  value,
  hint,
}: {
  label: string;
  value: number;
  hint?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-t border-line pt-2">
      <div>
        <div className="text-[12.5px] text-ink-2">{label}</div>
        {hint && <div className="text-[11px] text-ink-3 mt-0.5">{hint}</div>}
      </div>
      <div className="text-[14px] font-semibold text-ink">
        ৳{value.toLocaleString()}
      </div>
    </div>
  );
}

function fmt(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

