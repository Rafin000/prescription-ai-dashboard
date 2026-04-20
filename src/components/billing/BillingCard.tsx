import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowUpRight,
  CreditCard,
  Download,
  FileText,
  RotateCcw,
  Wallet,
} from 'lucide-react';
import { Card, CardHeader } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Modal } from '../ui/Modal';
import {
  useCancelSubscription,
  useInvoices,
  useResumeSubscription,
} from '../../queries/hooks';
import { useAuthStore } from '../../stores/authStore';
import type { Invoice, SubscriptionStatus } from '../../types';

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

export function BillingCard() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const { data: invoices = [] } = useInvoices();
  const cancel = useCancelSubscription();
  const resume = useResumeSubscription();
  const [confirmCancel, setConfirmCancel] = useState(false);

  const sub = user?.subscription;
  if (!sub) return null;

  const pendingCancel = !!sub.cancelAt;

  return (
    <Card className="lg:col-span-2">
      <CardHeader title="Subscription & billing" icon={<Wallet />} />
      <div className="p-5 grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-5">
        {/* Current plan summary */}
        <div className="rounded-lg border border-line bg-surface p-4 flex flex-col gap-3">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <div className="text-[10.5px] font-bold uppercase tracking-[1.4px] text-ink-3">
                Current plan
              </div>
              <div className="font-serif text-[22px] font-semibold text-ink mt-1 leading-tight">
                {sub.planId ? PLAN_LABEL[sub.planId] : 'No active plan'}
                <span className="text-[13px] text-ink-3 ml-2 font-normal">
                  {sub.cycle === 'yearly' ? 'Yearly' : sub.cycle === 'monthly' ? 'Monthly' : ''}
                </span>
              </div>
              <div className="text-[12.5px] text-ink-2 mt-1">
                {sub.amountBdt
                  ? `৳${sub.amountBdt.toLocaleString()} / ${sub.cycle === 'yearly' ? 'year' : 'month'}`
                  : 'No billing set up yet.'}
              </div>
            </div>
            <Badge tone={STATUS_TONE[sub.status]} variant="soft" uppercase>
              {sub.status.replace('_', ' ')}
            </Badge>
          </div>

          <div className="border-t border-line pt-3 text-[12px] text-ink-2 space-y-1.5">
            {pendingCancel ? (
              <div className="inline-flex items-start gap-2 text-warn">
                <AlertTriangle className="h-3.5 w-3.5 mt-0.5" />
                <span>
                  <b>Cancellation scheduled.</b> Access ends on {fmt(sub.cancelAt!)}.
                </span>
              </div>
            ) : sub.renewsAt ? (
              <div>
                Renews on <b className="text-ink">{fmt(sub.renewsAt)}</b>.
              </div>
            ) : null}
            {sub.lastTranId && (
              <div className="text-[11px] text-ink-3 font-mono">
                Last transaction · {sub.lastTranId}
              </div>
            )}
          </div>

          <div className="mt-1 flex items-center gap-2 flex-wrap">
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<CreditCard />}
              onClick={() => navigate('/billing')}
            >
              Change plan
            </Button>
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
              sub.status === 'active' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setConfirmCancel(true)}
                >
                  Cancel subscription
                </Button>
              )
            )}
          </div>
        </div>

        {/* Invoice history */}
        <div className="rounded-lg border border-line bg-surface p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="inline-flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[1.4px] text-ink-3">
              <FileText className="h-3 w-3" />
              Receipts
            </div>
            <span className="text-[11px] text-ink-3 font-mono">
              {invoices.length} total
            </span>
          </div>
          <ul className="flex flex-col divide-y divide-line -mx-1">
            {invoices.length === 0 && (
              <li className="px-1 py-3 text-[12px] text-ink-3 italic">
                No receipts yet — they'll appear here after your first successful payment.
              </li>
            )}
            {invoices.slice(0, 6).map((inv) => (
              <InvoiceRow key={inv.id} invoice={inv} />
            ))}
          </ul>
        </div>
      </div>

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
          {sub.renewsAt ? ` ${fmt(sub.renewsAt)}` : ' the end of the cycle'} and keep
          your workspace intact.
        </div>
      </Modal>
    </Card>
  );
}

function InvoiceRow({ invoice }: { invoice: Invoice }) {
  const tone =
    invoice.status === 'paid'
      ? 'success'
      : invoice.status === 'failed'
      ? 'danger'
      : invoice.status === 'cancelled'
      ? 'neutral'
      : 'warn';
  return (
    <li className="px-1 py-2.5 flex items-center gap-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-serif text-[13.5px] font-semibold text-ink">
            ৳{invoice.amountBdt.toLocaleString()}
          </span>
          <Badge tone={tone} variant="soft" uppercase>
            {invoice.status}
          </Badge>
          <span className="text-[11.5px] text-ink-3">
            {PLAN_LABEL[invoice.planId]} · {invoice.cycle}
          </span>
        </div>
        <div className="text-[11px] text-ink-3 font-mono mt-0.5 truncate">
          {fmt(invoice.createdAt)} · {invoice.tranId}
          {invoice.method && <> · {invoice.method}</>}
        </div>
      </div>
      {invoice.receiptUrl && invoice.status === 'paid' && (
        <a
          href={invoice.receiptUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-accent-ink hover:underline shrink-0"
          title="Download receipt"
        >
          <Download className="h-3 w-3" />
          Receipt
          <ArrowUpRight className="h-3 w-3" />
        </a>
      )}
    </li>
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
