import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, Lock, Shield } from 'lucide-react';
import { StepHeader } from './StepHeader';
import { Button } from '../../components/ui/Button';
import { useInitiateCheckout } from '../../queries/hooks';
import { cn } from '../../lib/cn';

type PlanId = 'starter' | 'pro' | 'clinic';
type Cycle = 'monthly' | 'yearly';

const PLANS: Array<{
  id: PlanId;
  name: string;
  monthly: number;
  tagline: string;
  features: string[];
  highlight?: boolean;
}> = [
  {
    id: 'starter',
    name: 'Starter',
    monthly: 1500,
    tagline: 'Solo doctor, single chamber.',
    features: ['Up to 50 consults / month', '1 chamber', 'Live transcription'],
  },
  {
    id: 'pro',
    name: 'Pro',
    monthly: 2500,
    tagline: 'For most private practices.',
    features: ['Unlimited consults', 'Multiple chambers', 'Video calls + AI captions', '2 team seats'],
    highlight: true,
  },
  {
    id: 'clinic',
    name: 'Clinic',
    monthly: 5000,
    tagline: 'Multi-doctor clinics.',
    features: ['Everything in Pro', 'Unlimited team seats', 'Custom roles & audit log'],
  },
];

interface Props {
  /** Shown above the plan picker. Defaults to the onboarding-step copy. */
  context?: 'onboarding' | 'billing' | 'change-plan';
  /** Where to go after the gateway completes. Default is onboarding's /done. */
  successPath?: string;
  failPath?: string;
  cancelPath?: string;
  /** Back button target — only rendered for the onboarding flow. */
  backPath?: string;
}

export function OnboardingPayment({
  context = 'onboarding',
  successPath = '/billing/success',
  failPath = '/billing/failed',
  cancelPath = '/billing/cancelled',
  backPath = '/onboarding/team',
}: Props) {
  const navigate = useNavigate();
  const initiate = useInitiateCheckout();

  const [planId, setPlanId] = useState<PlanId>('pro');
  const [cycle, setCycle] = useState<Cycle>('monthly');
  const [error, setError] = useState<string | null>(null);

  const plan = PLANS.find((p) => p.id === planId)!;
  const price = cycle === 'yearly' ? plan.monthly * 10 : plan.monthly;
  const yearlySavings = plan.monthly * 12 - plan.monthly * 10;

  const goToGateway = async () => {
    setError(null);
    const origin = window.location.origin;
    try {
      // Stash the context so the success callback can land on the right
      // page (onboarding → /onboarding/done, billing change → /billing).
      sessionStorage.setItem('pai.billing.context', context);
      const res = await initiate.mutateAsync({
        planId,
        cycle,
        successUrl: `${origin}${successPath}`,
        failUrl: `${origin}${failPath}`,
        cancelUrl: `${origin}${cancelPath}`,
      });
      // Real gateway URL in production; mock page in dev — both just get a redirect.
      window.location.href = res.gatewayUrl;
    } catch (err) {
      setError(
        (err as { message?: string })?.message ??
          'Could not start the payment session. Please try again.'
      );
    }
  };

  const isOnboarding = context === 'onboarding';

  return (
    <div className="flex flex-col gap-6">
      {isOnboarding && (
        <StepHeader
          eyebrow="Step 6 of 6"
          title="Pick your plan"
          description="A subscription unlocks live consultations, video calls, and the patient-facing tools. You'll be redirected to SSLCommerz's secure gateway to complete payment — we never see your card or wallet details."
        />
      )}

      {/* Cycle toggle */}
      <div className="inline-flex items-center gap-1 rounded-full bg-bg-muted border border-line p-1 self-start">
        {(['monthly', 'yearly'] as Cycle[]).map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCycle(c)}
            className={cn(
              'h-8 px-4 rounded-full text-[12.5px] font-semibold transition-colors',
              cycle === c ? 'bg-surface text-ink shadow-xs' : 'text-ink-3'
            )}
          >
            {c === 'monthly' ? 'Monthly' : 'Yearly'}
            {c === 'yearly' && (
              <span className="ml-1.5 text-[10px] font-bold uppercase tracking-[1.2px] text-success">
                save ৳{yearlySavings.toLocaleString()}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {PLANS.map((p) => {
          const selected = p.id === planId;
          const displayPrice = cycle === 'yearly' ? p.monthly * 10 : p.monthly;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => setPlanId(p.id)}
              className={cn(
                'text-left rounded-xl border p-4 flex flex-col gap-3 transition-all',
                selected
                  ? 'border-accent ring-2 ring-accent/30 bg-accent-softer/40'
                  : p.highlight
                  ? 'border-accent/30 bg-surface hover:border-accent/60'
                  : 'border-line bg-surface hover:border-line-strong'
              )}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-serif text-[18px] font-semibold text-ink">{p.name}</div>
                  <div className="text-[11.5px] text-ink-3 mt-0.5">{p.tagline}</div>
                </div>
                {p.highlight && (
                  <span className="text-[9.5px] font-bold uppercase tracking-[1.4px] bg-accent text-white px-1.5 py-[2px] rounded-xs">
                    Popular
                  </span>
                )}
              </div>
              <div className="flex items-baseline gap-1">
                <span className="font-serif text-[24px] font-semibold text-ink">
                  ৳{displayPrice.toLocaleString()}
                </span>
                <span className="text-[11.5px] text-ink-3">/ {cycle === 'yearly' ? 'year' : 'month'}</span>
              </div>
              <ul className="flex flex-col gap-1.5 text-[12px] text-ink-2">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-1.5">
                    <Check className="h-3 w-3 text-accent mt-1 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
            </button>
          );
        })}
      </div>

      {/* Gateway info */}
      <div className="rounded-lg border border-line bg-surface p-4 flex items-start gap-3">
        <div className="h-10 w-10 rounded-md bg-[#1b9d6b] text-white grid place-items-center font-bold text-[13px] shrink-0">
          SC
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-serif text-[14px] font-semibold text-ink">
            Pay with SSLCommerz
          </div>
          <p className="text-[12px] text-ink-2 mt-1 leading-relaxed">
            After you hit <b>Continue to payment</b>, we'll hand you off to
            SSLCommerz's secure gateway. You can pay with Visa/Mastercard/Amex
            cards, or any of bKash, Nagad, and Rocket wallets. You'll come back
            here the moment the transaction is confirmed.
          </p>
          <div className="mt-2 inline-flex items-center gap-2 text-[11px] text-ink-3">
            <Shield className="h-3 w-3 text-success" />
            PCI-DSS Level 1 · encrypted in transit · no card details ever
            touch our servers.
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-danger-soft border border-danger/30 text-danger text-[12.5px] px-3 py-2">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between gap-2 pt-2 border-t border-line">
        {isOnboarding ? (
          <Button variant="ghost" leftIcon={<ArrowLeft />} onClick={() => navigate(backPath)}>
            Back
          </Button>
        ) : (
          <span />
        )}
        <Button
          variant="primary"
          leftIcon={<Lock />}
          loading={initiate.isPending}
          onClick={goToGateway}
        >
          Continue to payment · ৳{price.toLocaleString()}
        </Button>
      </div>
    </div>
  );
}
