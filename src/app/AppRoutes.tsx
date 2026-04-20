import { Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import { ProtectedRoute, PublicOnlyRoute } from './RouteGuard';
import { OnboardingGate } from './OnboardingGate';
import { RoleGate } from '../auth/RoleGate';
import { OnboardingLayout } from '../pages/onboarding/OnboardingLayout';
import { OnboardingProfile } from '../pages/onboarding/OnboardingProfile';
import { OnboardingChambers } from '../pages/onboarding/OnboardingChambers';
import { OnboardingAvailability } from '../pages/onboarding/OnboardingAvailability';
import { OnboardingPreferences } from '../pages/onboarding/OnboardingPreferences';
import { OnboardingTeam } from '../pages/onboarding/OnboardingTeam';
import { OnboardingPayment } from '../pages/onboarding/OnboardingPayment';
import { OnboardingDone } from '../pages/onboarding/OnboardingDone';
import { Billing } from '../pages/Billing';
import { Usage } from '../pages/Usage';
import { MockSslczGateway } from '../pages/MockSslczGateway';
import { BillingCallback } from '../pages/BillingCallback';

import { Login } from '../pages/Login';
import { Dashboard } from '../pages/Dashboard';
import { Patients } from '../pages/Patients';
import { PatientDetail } from '../pages/PatientDetail';
import { LiveConsultation } from '../pages/LiveConsultation';
import { StartConsult } from '../pages/StartConsult';
import { StartCall } from '../pages/StartCall';
import { Consultations } from '../pages/Consultations';
import { Appointments } from '../pages/Appointments';
import { DoctorProfile } from '../pages/DoctorProfile';
import { Medicines } from '../pages/Medicines';
import { Templates } from '../pages/Templates';
import { Settings } from '../pages/Settings';
import { LabInbox } from '../pages/LabInbox';
import { VideoCall } from '../pages/VideoCall';
import { PatientJoin } from '../pages/PatientJoin';
import { Team } from '../pages/Team';
import { InviteAccept } from '../pages/InviteAccept';
import { NotFound } from '../pages/NotFound';

export function AppRoutes() {
  return (
    <Routes>
      {/* Public patient join — token is the capability, no login needed */}
      <Route path="/join/:token" element={<PatientJoin />} />
      {/* Public teammate invite — no account yet */}
      <Route path="/invite/:token" element={<InviteAccept />} />

      {/* Public (login) */}
      <Route element={<PublicOnlyRoute />}>
        <Route path="/login" element={<Login />} />
      </Route>

      {/* Protected but full-screen (no app shell) — the call surface */}
      <Route element={<ProtectedRoute />}>
        <Route element={<OnboardingGate />}>
          <Route element={<RoleGate require="consult:start" redirectTo="/appointments" />}>
            <Route path="/call/:appointmentId" element={<VideoCall />} />
          </Route>
        </Route>
      </Route>

      {/* Onboarding — protected, but bypasses the OnboardingGate's redirect
          logic (the gate IS what funnels people here). */}
      <Route element={<ProtectedRoute />}>
        <Route element={<OnboardingGate />}>
          <Route element={<OnboardingLayout />}>
            <Route path="/onboarding" element={<Navigate to="/onboarding/profile" replace />} />
            <Route path="/onboarding/profile" element={<OnboardingProfile />} />
            <Route path="/onboarding/chambers" element={<OnboardingChambers />} />
            <Route path="/onboarding/availability" element={<OnboardingAvailability />} />
            <Route path="/onboarding/preferences" element={<OnboardingPreferences />} />
            <Route path="/onboarding/team" element={<OnboardingTeam />} />
            <Route path="/onboarding/payment" element={<OnboardingPayment />} />
            <Route path="/onboarding/done" element={<OnboardingDone />} />
          </Route>
        </Route>
      </Route>

      {/* Payment gateway + its post-payment callbacks. Authenticated, but
          outside the OnboardingGate so they can run while the subscription
          flag is still flipping. */}
      <Route element={<ProtectedRoute />}>
        <Route path="/mock/sslcz/:sessionKey" element={<MockSslczGateway />} />
        <Route path="/billing/success" element={<BillingCallback outcome="success" />} />
        <Route path="/billing/failed" element={<BillingCallback outcome="failed" />} />
        <Route path="/billing/cancelled" element={<BillingCallback outcome="cancelled" />} />
      </Route>

      {/* Protected app */}
      <Route element={<ProtectedRoute />}>
        <Route element={<OnboardingGate />}>
        <Route element={<AppLayout />}>
          <Route index element={<Dashboard />} />

          <Route element={<RoleGate require="patient:read" />}>
            <Route path="patients" element={<Patients />} />
            <Route path="patients/:id" element={<PatientDetail />} />
          </Route>

          <Route element={<RoleGate require="consult:start" redirectTo="/patients" />}>
            <Route path="start-consult" element={<StartConsult />} />
            <Route path="start-call" element={<StartCall />} />
            <Route path="consult/:patientId" element={<LiveConsultation />} />
          </Route>

          <Route element={<RoleGate require="appointment:read" />}>
            <Route path="appointments" element={<Appointments />} />
          </Route>

          <Route element={<RoleGate require="patient:read" />}>
            <Route path="consultations" element={<Consultations />} />
          </Route>

          <Route element={<RoleGate require="report:read" redirectTo="/patients" />}>
            <Route path="inbox" element={<LabInbox />} />
          </Route>

          <Route element={<RoleGate require="medicine:read" />}>
            <Route path="medicines" element={<Medicines />} />
          </Route>

          <Route element={<RoleGate require="template:read" />}>
            <Route path="templates" element={<Templates />} />
          </Route>

          <Route element={<RoleGate require="settings:manage" />}>
            <Route path="profile" element={<DoctorProfile />} />
            <Route path="settings" element={<Settings />} />
            <Route path="billing" element={<Billing />} />
            <Route path="usage" element={<Usage />} />
          </Route>

          <Route element={<RoleGate require="team:read" />}>
            <Route path="team" element={<Team />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
