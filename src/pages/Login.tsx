import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AtSign, Lock, Phone, ShieldCheck, Stethoscope } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { BrandMark } from '../components/layout/BrandMark';
import { useAuthStore } from '../stores/authStore';

type Mode = 'email' | 'phone';

interface LocationState {
  from?: { pathname: string };
}

export function Login() {
  const login = useAuthStore((s) => s.login);
  const loadingState = useAuthStore((s) => s.status === 'loading');
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = (location.state as LocationState | null)?.from?.pathname ?? '/';

  const [mode, setMode] = useState<Mode>('email');
  const [identifier, setIdentifier] = useState('dr.ashraful@prescriptionai.bd');
  const [password, setPassword] = useState('demo1234');
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await login({ identifier, password });
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError((err as { message?: string })?.message ?? 'Sign-in failed.');
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-[1.05fr_0.95fr] bg-bg">
      {/* Form side */}
      <div className="flex items-center justify-center px-6 py-10">
        <div className="w-full max-w-[420px]">
          <div className="mb-8">
            <BrandMark />
          </div>

          <h1 className="font-serif text-[28px] font-semibold text-ink leading-tight tracking-tight">
            Welcome back, doctor.
          </h1>
          <p className="text-[13.5px] text-ink-2 mt-2 max-w-sm">
            Sign in to continue writing prescriptions, managing patients, and reviewing your
            appointments.
          </p>

          <div className="mt-6 inline-flex p-1 bg-bg-muted rounded-md border border-line">
            <button
              type="button"
              onClick={() => {
                setMode('email');
                setIdentifier('dr.ashraful@prescriptionai.bd');
              }}
              className={`h-7 px-3 rounded-sm text-[12.5px] font-semibold transition-colors ${
                mode === 'email' ? 'bg-surface text-ink shadow-xs' : 'text-ink-3'
              }`}
            >
              Email
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('phone');
                setIdentifier('+880 1711-000 001');
              }}
              className={`h-7 px-3 rounded-sm text-[12.5px] font-semibold transition-colors ${
                mode === 'phone' ? 'bg-surface text-ink shadow-xs' : 'text-ink-3'
              }`}
            >
              Phone
            </button>
          </div>

          <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-4">
            <Input
              label={mode === 'email' ? 'Email address' : 'Phone number'}
              type={mode === 'email' ? 'email' : 'tel'}
              autoComplete={mode === 'email' ? 'email' : 'tel'}
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              leftIcon={mode === 'email' ? <AtSign /> : <Phone />}
              placeholder={mode === 'email' ? 'you@clinic.bd' : '+880 1XXX-XXX XXX'}
              inputSize="lg"
              required
            />
            <Input
              label="Password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              leftIcon={<Lock />}
              placeholder="••••••••"
              inputSize="lg"
              required
            />

            {error && (
              <div
                role="alert"
                className="rounded-md bg-danger-soft border border-danger/30 text-danger text-[12.5px] px-3 py-2"
              >
                {error}
              </div>
            )}

            <div className="flex items-center justify-between text-[12.5px]">
              <label className="inline-flex items-center gap-2 text-ink-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="h-4 w-4 rounded border-line text-accent focus:ring-accent"
                />
                Remember me on this device
              </label>
              <Link to="/forgot" className="text-accent-ink font-semibold hover:underline">
                Forgot password?
              </Link>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              loading={loadingState}
              leftIcon={<Stethoscope />}
            >
              Sign in
            </Button>

            <div className="text-center text-[12.5px] text-ink-3">
              New to Prescription AI?{' '}
              <Link to="/register" className="text-accent-ink font-semibold hover:underline">
                Sign up
              </Link>
            </div>
          </form>

          <div className="mt-6 pt-5 border-t border-line text-[11px] text-ink-3 flex items-center gap-2">
            <ShieldCheck className="h-3.5 w-3.5 text-accent" />
            Your session is protected with short-lived access tokens and auto-rotating refresh
            tokens.
          </div>
        </div>
      </div>

      {/* Marketing side */}
      <div className="hidden lg:flex relative bg-gradient-to-br from-accent to-accent-hover overflow-hidden">
        <div className="absolute inset-0 opacity-20 [background-image:radial-gradient(circle_at_20%_10%,rgba(255,255,255,0.35),transparent_35%),radial-gradient(circle_at_85%_80%,rgba(255,255,255,0.2),transparent_40%)]" />
        <div className="relative z-10 flex flex-col justify-between p-12 text-white w-full">
          <div className="text-[11px] font-bold uppercase tracking-[1.8px] text-accent-soft">
            Prescription AI · for doctors
          </div>
          <div className="max-w-md">
            <div className="font-serif text-[30px] font-semibold leading-tight mb-4">
              Write better prescriptions in half the time.
            </div>
            <p className="text-[14px] text-white/85 leading-relaxed">
              Listens to your consultation, drafts a structured Rx in real time, and keeps every
              patient's history one click away — while you focus on the patient.
            </p>
            <ul className="mt-6 space-y-2 text-[13px] text-white/90">
              <li>✓ Two-column traditional Rx format, print-ready</li>
              <li>✓ AI-assisted medicine suggestions, your brands & ratings</li>
              <li>✓ BMDC-aware templates, chamber schedules, appointments</li>
            </ul>
          </div>
          <div className="text-[11.5px] text-white/70 font-mono">
            © 2026 Prescription AI · Dhaka, Bangladesh
          </div>
        </div>
      </div>
    </div>
  );
}
