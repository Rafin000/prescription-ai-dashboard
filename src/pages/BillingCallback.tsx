import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AlertTriangle, Check, Loader2, XCircle } from 'lucide-react';
import { BrandMark } from '../components/layout/BrandMark';
import { Button } from '../components/ui/Button';
import { useVerifyCheckout } from '../queries/hooks';

type Outcome = 'success' | 'failed' | 'cancelled';

interface Props {
  outcome: Outcome;
}

/**
 * Landing pages SSLCommerz redirects to after the hosted checkout. The
 * success variant verifies the transaction id against the backend (which
 * mirrors SSLCommerz's validator API), then bounces into the app. Failure
 * and cancel just present a retry CTA.
 */
export function BillingCallback({ outcome }: Props) {
  const [search] = useSearchParams();
  const navigate = useNavigate();
  const verify = useVerifyCheckout();

  const tranId = search.get('tran_id') ?? '';
  const [error, setError] = useState<string | null>(null);
  const [verifiedAmount, setVerifiedAmount] = useState<number | null>(null);
  const attempted = useRef(false);

  useEffect(() => {
    if (outcome !== 'success') return;
    if (attempted.current) return; // guard against StrictMode double-invoke
    attempted.current = true;
    if (!tranId) {
      setError('Missing transaction id from the gateway.');
      return;
    }
    verify
      .mutateAsync({ tranId })
      .then((res) => {
        setVerifiedAmount(res.invoice.amountBdt);
        // Route based on why the payment was made — onboarding lands on the
        // welcome page, a plan change or re-subscribe lands back on Billing.
        const ctx = sessionStorage.getItem('pai.billing.context');
        sessionStorage.removeItem('pai.billing.context');
        const destination = ctx === 'onboarding' ? '/onboarding/done' : '/billing';
        const state =
          destination === '/billing'
            ? { toast: `Payment received · ৳${res.invoice.amountBdt.toLocaleString()} charged` }
            : undefined;
        window.setTimeout(
          () => navigate(destination, { replace: true, state }),
          1200
        );
      })
      .catch((err) =>
        setError((err as { message?: string })?.message ?? 'Could not verify the payment.')
      );
  }, [outcome, tranId, verify, navigate]);

  return (
    <div className="min-h-screen bg-bg grid place-items-center px-5">
      <div className="max-w-[480px] w-full rounded-2xl border border-line bg-surface shadow-sm p-8 text-center">
        <div className="flex justify-center mb-5">
          <BrandMark />
        </div>

        {outcome === 'success' && !error && (
          <>
            <div className="relative inline-flex h-14 w-14 rounded-full bg-success text-white items-center justify-center mb-4">
              {verify.isPending ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                <Check className="h-7 w-7" />
              )}
            </div>
            <h1 className="font-serif text-[24px] font-semibold text-ink">
              {verify.isPending ? 'Verifying payment…' : 'Payment received'}
            </h1>
            <p className="text-[13px] text-ink-2 mt-2 leading-relaxed">
              {verify.isPending
                ? 'Hang tight while we confirm the transaction with SSLCommerz.'
                : verifiedAmount
                ? `৳${verifiedAmount.toLocaleString()} charged successfully. Unlocking your account…`
                : 'Unlocking your account…'}
            </p>
            <div className="mt-3 text-[11px] text-ink-3 font-mono">
              Transaction · {tranId || '—'}
            </div>
          </>
        )}

        {outcome === 'success' && error && (
          <Failure
            icon={<AlertTriangle className="h-7 w-7" />}
            title="We couldn't verify the payment"
            body={error}
            onRetry={() => navigate('/billing')}
          />
        )}

        {outcome === 'failed' && (
          <Failure
            icon={<XCircle className="h-7 w-7" />}
            title="Payment failed"
            body="The gateway couldn't complete your transaction. No money was taken. You can try again with a different method."
            onRetry={() => navigate('/billing')}
          />
        )}

        {outcome === 'cancelled' && (
          <Failure
            icon={<XCircle className="h-7 w-7" />}
            title="Payment cancelled"
            body="You cancelled the payment on the gateway. You can start again whenever you're ready."
            onRetry={() => navigate('/billing')}
          />
        )}
      </div>
    </div>
  );
}

function Failure({
  icon,
  title,
  body,
  onRetry,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  onRetry: () => void;
}) {
  return (
    <>
      <div className="inline-flex h-14 w-14 rounded-full bg-danger-soft text-danger items-center justify-center mb-4">
        {icon}
      </div>
      <h1 className="font-serif text-[24px] font-semibold text-ink">{title}</h1>
      <p className="text-[13px] text-ink-2 mt-2 leading-relaxed">{body}</p>
      <div className="mt-6 flex items-center justify-center gap-2">
        <Button variant="primary" onClick={onRetry}>
          Try again
        </Button>
      </div>
    </>
  );
}
