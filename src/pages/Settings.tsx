import { Bell, FlaskConical, Languages, Palette, Printer, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../components/layout/PageHeader';
import { Card, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useAuthStore } from '../stores/authStore';
import { http } from '../lib/http';
export function Settings() {
  const logout = useAuthStore((s) => s.logout);
  const setUser = useAuthStore((s) => s.setUser);
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();

  const resetOnboarding = async () => {
    const r = await http.post('/dev/reset-onboarding');
    setUser(r.data);
    navigate('/onboarding/profile');
  };

  const simulateLapse = async () => {
    if (!user) return;
    setUser({
      ...user,
      subscription: { ...user.subscription, status: 'past_due' },
    });
    navigate('/billing');
  };
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Settings"
        description="Preferences for notifications, language, printing, and security."
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card>
          <CardHeader title="Language & region" icon={<Languages />} />
          <div className="p-5 space-y-4 text-[13px]">
            <Row label="Interface language" value="English" />
            <Row label="Prescription language" value="English + বাংলা" />
            <Row label="Date format" value="dd MMM yyyy" />
            <Row label="Time format" value="12-hour" />
          </div>
        </Card>

        <Card>
          <CardHeader title="Notifications" icon={<Bell />} />
          <div className="p-5 space-y-3 text-[13px]">
            <Toggle label="Appointment confirmations" on />
            <Toggle label="Lab report uploaded" on />
            <Toggle label="Patient reschedules" on />
            <Toggle label="Weekly clinic summary" />
          </div>
        </Card>

        <Card>
          <CardHeader title="Printing" icon={<Printer />} />
          <div className="p-5 space-y-3 text-[13px]">
            <Row label="Default paper size" value="A5" />
            <Row label="Include pharmacy tear-off" value="Yes" />
            <Row label="Letterhead template" value="Clinical & calm (default)" />
          </div>
        </Card>

        <Card>
          <CardHeader title="Theme" icon={<Palette />} />
          <div className="p-5 space-y-3 text-[13px]">
            <Row label="Appearance" value="Light (clinical teal)" />
            <Row label="Accent density" value="Comfortable" />
          </div>
        </Card>

        <Card className="lg:col-span-2 border-warn/30 bg-warn-soft/40">
          <CardHeader title="Demo controls" icon={<FlaskConical />} />
          <div className="p-5 flex items-center justify-between gap-4 flex-wrap">
            <div className="text-[12.5px] text-ink-2 max-w-[480px]">
              Exercise the first-launch flow or the billing wall. Mock-only —
              won't show in production.
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Button variant="ghost" onClick={simulateLapse}>
                Simulate lapsed subscription
              </Button>
              <Button variant="secondary" onClick={resetOnboarding}>
                Reset &amp; restart onboarding
              </Button>
            </div>
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader title="Security" icon={<ShieldCheck />} />
          <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
            <Row label="Password" value="Last changed 23 days ago" />
            <Row label="Two-factor authentication" value="Enabled · SMS" />
            <Row label="Active sessions" value="2 devices" />
            <Row label="Auto-lock when idle" value="30 minutes" />
          </div>
          <div className="px-5 pb-5 flex items-center gap-2">
            <Button variant="secondary">Change password</Button>
            <Button variant="ghost" onClick={() => logout()}>
              Sign out of all devices
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-ink-3">{label}</span>
      <span className="font-medium text-ink-2">{value}</span>
    </div>
  );
}

function Toggle({ label, on }: { label: string; on?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-ink-2">{label}</span>
      <span
        className={`h-5 w-9 rounded-full relative transition-colors ${
          on ? 'bg-accent' : 'bg-line-strong'
        }`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 bg-white rounded-full shadow-sm transition-all ${
            on ? 'left-[18px]' : 'left-0.5'
          }`}
        />
      </span>
    </div>
  );
}
