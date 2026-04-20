import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Building2,
  Calendar,
  Check,
  ChevronRight,
  CreditCard,
  LogOut,
  Settings,
  Sparkles,
  User,
  Users2,
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { BrandMark } from '../../components/layout/BrandMark';
import { cn } from '../../lib/cn';
import type { OnboardingStep } from '../../types';

interface StepDef {
  id: OnboardingStep;
  label: string;
  description: string;
  icon: React.ReactNode;
  path: string;
  optional?: boolean;
}

const STEPS: StepDef[] = [
  {
    id: 'profile',
    label: 'Your profile',
    description: 'BMDC, name, signature.',
    icon: <User className="h-3.5 w-3.5" />,
    path: '/onboarding/profile',
  },
  {
    id: 'chambers',
    label: 'Chambers',
    description: 'Where you see patients.',
    icon: <Building2 className="h-3.5 w-3.5" />,
    path: '/onboarding/chambers',
  },
  {
    id: 'availability',
    label: 'Availability',
    description: 'In-person & video slots.',
    icon: <Calendar className="h-3.5 w-3.5" />,
    path: '/onboarding/availability',
  },
  {
    id: 'preferences',
    label: 'Preferences',
    description: 'Rx defaults & footer.',
    icon: <Settings className="h-3.5 w-3.5" />,
    path: '/onboarding/preferences',
    optional: true,
  },
  {
    id: 'team',
    label: 'Team',
    description: 'Invite assistants.',
    icon: <Users2 className="h-3.5 w-3.5" />,
    path: '/onboarding/team',
    optional: true,
  },
  {
    id: 'payment',
    label: 'Subscription',
    description: 'Pick a plan to go live.',
    icon: <CreditCard className="h-3.5 w-3.5" />,
    path: '/onboarding/payment',
  },
];

export function OnboardingLayout() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const currentIdx = Math.max(
    0,
    STEPS.findIndex((s) => s.id === user?.onboardingStep)
  );
  const completedIds = new Set(STEPS.slice(0, currentIdx).map((s) => s.id));

  return (
    <div className="min-h-screen bg-bg flex">
      {/* Sidebar */}
      <aside className="hidden lg:flex flex-col w-[280px] shrink-0 border-r border-line bg-surface">
        <div className="h-16 px-5 flex items-center border-b border-line">
          <BrandMark />
        </div>

        <div className="px-5 py-5 border-b border-line">
          <div className="text-[10.5px] font-bold uppercase tracking-[1.4px] text-accent-ink inline-flex items-center gap-1.5">
            <Sparkles className="h-3 w-3" />
            Get set up
          </div>
          <h2 className="font-serif text-[18px] font-semibold text-ink mt-1.5 leading-tight">
            Welcome, {user?.name?.split(' ')[1] ?? user?.name ?? 'doctor'}.
          </h2>
          <p className="text-[12px] text-ink-3 mt-1">
            Six quick steps and you're in. You can come back to skipped ones from Settings later.
          </p>
        </div>

        <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
          {STEPS.map((step, i) => {
            const isDone = completedIds.has(step.id);
            const isActive = pathname === step.path;
            const isAhead = i > currentIdx && !isDone;
            return (
              <button
                key={step.id}
                type="button"
                disabled={isAhead}
                onClick={() => navigate(step.path)}
                className={cn(
                  'group flex items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors',
                  isActive
                    ? 'bg-accent-softer'
                    : isAhead
                    ? 'opacity-50 cursor-not-allowed'
                    : 'hover:bg-bg-muted'
                )}
              >
                <span
                  className={cn(
                    'h-7 w-7 rounded-full grid place-items-center text-[10px] font-bold shrink-0 mt-0.5',
                    isDone
                      ? 'bg-success text-white'
                      : isActive
                      ? 'bg-accent text-white'
                      : 'bg-bg-muted text-ink-3 border border-line'
                  )}
                >
                  {isDone ? <Check className="h-3.5 w-3.5" /> : i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={cn(
                        'font-serif text-[13.5px] font-semibold',
                        isActive ? 'text-accent-ink' : 'text-ink'
                      )}
                    >
                      {step.label}
                    </span>
                    {step.optional && (
                      <span className="text-[9px] font-bold uppercase tracking-[1.2px] text-ink-3 bg-bg-muted border border-line rounded-xs px-1 py-[1px]">
                        Optional
                      </span>
                    )}
                  </div>
                  <div className="text-[11.5px] text-ink-3 mt-0.5 leading-tight">
                    {step.description}
                  </div>
                </div>
                {isActive && <ChevronRight className="h-3.5 w-3.5 text-accent shrink-0 mt-2" />}
              </button>
            );
          })}
        </nav>

        <div className="px-5 py-4 border-t border-line">
          <div className="text-[11px] text-ink-3 mb-2">Signed in as</div>
          <div className="text-[12.5px] font-semibold text-ink truncate">{user?.email}</div>
          <button
            type="button"
            onClick={() => logout()}
            className="mt-3 inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-ink-3 hover:text-danger"
          >
            <LogOut className="h-3 w-3" />
            Sign out
          </button>
        </div>
      </aside>

      <main className="flex-1 min-w-0 flex flex-col">
        {/* Mobile stepper */}
        <div className="lg:hidden px-4 py-3 border-b border-line bg-surface">
          <div className="flex items-center justify-between">
            <BrandMark />
            <div className="text-[11px] text-ink-3 font-mono">
              Step {currentIdx + 1} / {STEPS.length}
            </div>
          </div>
          <div className="mt-2 h-1.5 rounded-full bg-bg-muted overflow-hidden">
            <span
              className="block h-full bg-accent transition-[width]"
              style={{ width: `${((currentIdx + 1) / STEPS.length) * 100}%` }}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="max-w-[760px] mx-auto px-5 lg:px-10 py-8 lg:py-12">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
}
