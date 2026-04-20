import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import type { OnboardingStep } from '../types';

const STEP_PATHS: Record<OnboardingStep, string> = {
  profile: '/onboarding/profile',
  chambers: '/onboarding/chambers',
  availability: '/onboarding/availability',
  preferences: '/onboarding/preferences',
  team: '/onboarding/team',
  payment: '/onboarding/payment',
  done: '/onboarding/done',
};

/**
 * Sits inside ProtectedRoute. Once the user is authenticated, ensures they
 * complete onboarding and have an active subscription before any app-shell
 * route renders. Both gates read from `me` so swapping in a real backend is
 * a one-line change.
 */
export function OnboardingGate() {
  const user = useAuthStore((s) => s.user);
  const location = useLocation();

  if (!user) return <Outlet />; // ProtectedRoute already handled auth

  const onOnboardingPath = location.pathname.startsWith('/onboarding');
  const onBillingPath = location.pathname === '/billing';

  // Gate 1 — onboarding incomplete → push into the right step.
  if (!user.onboardingComplete) {
    if (onOnboardingPath) return <Outlet />;
    return <Navigate to={STEP_PATHS[user.onboardingStep] ?? '/onboarding/profile'} replace />;
  }

  // Gate 2 — subscription must be active or trialing.
  const subStatus = user.subscription?.status;
  const subscribed = subStatus === 'active' || subStatus === 'trialing';
  if (!subscribed) {
    if (onBillingPath) return <Outlet />;
    return <Navigate to="/billing" replace />;
  }

  // Both gates green — but if they manually nav to /onboarding while done,
  // bounce them back home (except for /onboarding/done, the friendly landing
  // shown right after payment).
  if (onOnboardingPath && location.pathname !== '/onboarding/done') {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
