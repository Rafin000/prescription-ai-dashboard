import { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { CreditCard, Lock, Shield, Smartphone, X } from 'lucide-react';
import { http } from '../lib/http';
import { cn } from '../lib/cn';

type Method = 'card' | 'bkash' | 'nagad' | 'rocket';

interface SessionDetails {
  sessionKey: string;
  tranId: string;
  planId: 'starter' | 'pro' | 'clinic';
  cycle: 'monthly' | 'yearly';
  amountBdt: number;
  status: 'pending' | 'paid' | 'failed' | 'cancelled';
  doctor: { name: string; email: string };
}

const PLAN_LABEL: Record<SessionDetails['planId'], string> = {
  starter: 'Starter',
  pro: 'Pro',
  clinic: 'Clinic',
};

const METHODS: Array<{
  id: Method;
  label: string;
  icon: React.ReactNode;
  hint: string;
}> = [
  { id: 'card', label: 'Visa / Mastercard / Amex', icon: <CreditCard className="h-4 w-4" />, hint: 'ending in 4242' },
  { id: 'bkash', label: 'bKash', icon: <Smartphone className="h-4 w-4" />, hint: '017** *** 210' },
  { id: 'nagad', label: 'Nagad', icon: <Smartphone className="h-4 w-4" />, hint: '018** *** 544' },
  { id: 'rocket', label: 'Rocket', icon: <Smartphone className="h-4 w-4" />, hint: '015** *** 890' },
];

/**
 * Mock of SSLCommerz's hosted checkout. In production this is
 * securepay.sslcommerz.com/gwprocess/v4/gw.php — swapping to the real
 * gateway is a URL change in billingService, nothing else.
 *
 * The page lets the demo user simulate a successful payment, a failure, or
 * a cancel, then redirects back to the frontend's callback URLs with the
 * transaction id appended.
 */
export function MockSslczGateway() {
  const { sessionKey } = useParams<{ sessionKey: string }>();
  const [search] = useSearchParams();
  const [session, setSession] = useState<SessionDetails | null>(null);
  const [method, setMethod] = useState<Method>('card');
  const [busy, setBusy] = useState<'paid' | 'failed' | 'cancelled' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const successUrl = search.get('success_url') ?? '/billing/success';
  const failUrl = search.get('fail_url') ?? '/billing/failed';
  const cancelUrl = search.get('cancel_url') ?? '/billing/cancelled';

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await http.get<SessionDetails>(
          `/billing/sslcz/session/${sessionKey}`
        );
        if (!cancelled) setSession(r.data);
      } catch (err) {
        if (!cancelled)
          setError((err as { message?: string })?.message ?? 'Invalid session.');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionKey]);

  const formatted = useMemo(
    () => (session ? session.amountBdt.toLocaleString() : '…'),
    [session]
  );

  const settle = async (outcome: 'paid' | 'failed' | 'cancelled') => {
    if (!session) return;
    setBusy(outcome);
    try {
      await http.post('/billing/sslcz/session/settle', {
        sessionKey: session.sessionKey,
        outcome,
        method: outcome === 'paid' ? METHODS.find((m) => m.id === method)?.label : undefined,
        methodHint: outcome === 'paid' ? METHODS.find((m) => m.id === method)?.hint : undefined,
      });
      const dest =
        outcome === 'paid' ? successUrl : outcome === 'failed' ? failUrl : cancelUrl;
      // Tran id round-trips back to the frontend so `verify` can validate it.
      const redirect = `${dest}?tran_id=${encodeURIComponent(session.tranId)}`;
      window.location.href = redirect;
    } catch (err) {
      setError((err as { message?: string })?.message ?? 'Payment simulation failed.');
      setBusy(null);
    }
  };

  if (error) {
    return (
      <div className="min-h-screen bg-bg-muted grid place-items-center p-6">
        <div className="max-w-[420px] text-center">
          <div className="font-serif text-[20px] font-semibold text-danger mb-2">
            Payment session error
          </div>
          <p className="text-[13px] text-ink-2">{error}</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-bg-muted grid place-items-center">
        <div className="text-[12.5px] font-mono uppercase tracking-[1.4px] text-ink-3">
          Loading SSLCommerz…
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#eef2f6]">
      {/* Fake SSLCommerz header bar */}
      <header className="h-14 bg-white border-b border-line px-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-md bg-[#1b9d6b] text-white grid place-items-center font-bold text-[11px]">
            SC
          </div>
          <div className="font-serif text-[15px] font-semibold text-ink">SSLCommerz</div>
          <span className="text-[10.5px] font-bold uppercase tracking-[1.4px] text-ink-3 bg-bg-muted rounded-xs px-1.5 py-[2px] ml-2">
            Secure gateway · mock
          </span>
        </div>
        <div className="inline-flex items-center gap-1.5 text-[11.5px] text-ink-3 font-mono">
          <Lock className="h-3.5 w-3.5 text-success" />
          session · {session.sessionKey.slice(-10)}
        </div>
      </header>

      <main className="max-w-[760px] mx-auto px-5 py-8 grid grid-cols-1 md:grid-cols-[1fr_300px] gap-5 items-start">
        {/* Method picker */}
        <div className="rounded-xl bg-white border border-line p-5 shadow-sm">
          <h2 className="font-serif text-[18px] font-semibold text-ink leading-tight">
            Choose a payment method
          </h2>
          <p className="text-[12px] text-ink-3 mt-1">
            In the real gateway you'd enter card / mobile-wallet details on this
            page. For the demo, just pick one and hit <b>Pay</b>.
          </p>

          <div className="mt-5 flex flex-col gap-2">
            {METHODS.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setMethod(m.id)}
                className={cn(
                  'rounded-lg border p-3 flex items-center gap-3 text-left transition-colors',
                  method === m.id
                    ? 'border-[#1b9d6b] bg-[#e9f7f0]'
                    : 'border-line bg-surface hover:border-line-strong'
                )}
              >
                <span
                  className={cn(
                    'h-9 w-9 rounded-md grid place-items-center',
                    method === m.id ? 'bg-[#1b9d6b] text-white' : 'bg-bg-muted text-ink-3'
                  )}
                >
                  {m.icon}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="font-serif text-[14px] font-semibold text-ink">
                    {m.label}
                  </div>
                  <div className="text-[11.5px] text-ink-3 mt-0.5 font-mono">{m.hint}</div>
                </div>
                <span
                  className={cn(
                    'h-4 w-4 rounded-full border',
                    method === m.id
                      ? 'bg-[#1b9d6b] border-[#1b9d6b]'
                      : 'border-ink-3'
                  )}
                />
              </button>
            ))}
          </div>

          <div className="mt-5 flex items-center gap-2 text-[11.5px] text-ink-3">
            <Shield className="h-3.5 w-3.5 text-success" />
            Payment is end-to-end encrypted. We never see your card or wallet number.
          </div>

          <div className="mt-6 flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => settle('paid')}
              disabled={!!busy}
              className="h-11 px-5 rounded-md bg-[#1b9d6b] text-white font-semibold text-[13.5px] hover:brightness-95 disabled:opacity-60"
            >
              {busy === 'paid' ? 'Processing…' : `Pay ৳${formatted}`}
            </button>
            <button
              type="button"
              onClick={() => settle('failed')}
              disabled={!!busy}
              className="h-11 px-4 rounded-md border border-line bg-surface text-ink-2 font-semibold text-[12.5px] hover:bg-bg-muted disabled:opacity-60"
            >
              Simulate failure
            </button>
            <button
              type="button"
              onClick={() => settle('cancelled')}
              disabled={!!busy}
              className="h-11 px-4 rounded-md text-ink-3 font-semibold text-[12.5px] hover:text-danger inline-flex items-center gap-1"
            >
              <X className="h-3 w-3" />
              Cancel
            </button>
          </div>
        </div>

        {/* Order summary */}
        <aside className="rounded-xl bg-white border border-line p-5 shadow-sm">
          <div className="text-[10.5px] font-bold uppercase tracking-[1.4px] text-ink-3">
            Order summary
          </div>
          <div className="mt-3 font-serif text-[16px] font-semibold text-ink">
            Prescription AI · {PLAN_LABEL[session.planId]}
          </div>
          <div className="text-[12px] text-ink-3 capitalize">{session.cycle}</div>

          <div className="mt-4 border-t border-line pt-4 text-[12.5px] space-y-2">
            <Row label="Plan" value={PLAN_LABEL[session.planId]} />
            <Row label="Cycle" value={session.cycle === 'yearly' ? 'Yearly' : 'Monthly'} />
            <Row label="VAT" value="Included" />
          </div>

          <div className="mt-4 border-t border-line pt-4 flex items-center justify-between">
            <span className="text-[12.5px] font-semibold text-ink-2">Total</span>
            <span className="font-serif text-[20px] font-semibold text-ink">
              ৳{formatted}
            </span>
          </div>

          <div className="mt-5 text-[11px] text-ink-3 leading-relaxed">
            Billing account · {session.doctor.email}
            <br />
            Transaction · <span className="font-mono">{session.tranId}</span>
          </div>
        </aside>
      </main>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-ink-3">{label}</span>
      <span className="text-ink-2 font-medium">{value}</span>
    </div>
  );
}
