import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AtSign,
  BadgeCheck,
  Lock,
  Phone,
  ShieldCheck,
  Stethoscope,
  User,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { BrandMark } from '../components/layout/BrandMark';
import { useAuthStore } from '../stores/authStore';

export function Register() {
  const signup = useAuthStore((s) => s.signup);
  const loading = useAuthStore((s) => s.status === 'loading');
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [bmdcNo, setBmdcNo] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    try {
      await signup({
        name: name.trim(),
        email: email.trim(),
        password,
        specialty: specialty.trim(),
        bmdcNo: bmdcNo.trim() || undefined,
        phone: phone.trim() || undefined,
      });
      navigate('/', { replace: true });
    } catch (err) {
      setError((err as { message?: string })?.message ?? 'Could not create your account.');
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-[1.05fr_0.95fr] bg-bg">
      {/* Form side */}
      <div className="flex items-center justify-center px-6 py-10">
        <div className="w-full max-w-[460px]">
          <div className="mb-8">
            <BrandMark />
          </div>

          <h1 className="font-serif text-[28px] font-semibold text-ink leading-tight tracking-tight">
            Create your doctor account
          </h1>
          <p className="text-[13.5px] text-ink-2 mt-2 max-w-sm">
            You'll land in onboarding next — set up your chambers, availability,
            and plan, then start using the app with your team.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
            <Input
              label="Full name"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              leftIcon={<User />}
              placeholder="Dr. Ashraful Karim"
              inputSize="lg"
              required
            />

            <Input
              label="Email address"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              leftIcon={<AtSign />}
              placeholder="you@clinic.bd"
              inputSize="lg"
              required
            />

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Specialty"
                value={specialty}
                onChange={(e) => setSpecialty(e.target.value)}
                leftIcon={<Stethoscope />}
                placeholder="Cardiology"
                inputSize="lg"
                required
              />
              <Input
                label="BMDC number"
                value={bmdcNo}
                onChange={(e) => setBmdcNo(e.target.value)}
                leftIcon={<BadgeCheck />}
                placeholder="A-12345"
                inputSize="lg"
              />
            </div>

            <Input
              label="Phone"
              type="tel"
              autoComplete="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              leftIcon={<Phone />}
              placeholder="+880 1XXX-XXX XXX"
              inputSize="lg"
            />

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                leftIcon={<Lock />}
                placeholder="••••••••"
                inputSize="lg"
                required
              />
              <Input
                label="Confirm password"
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                leftIcon={<Lock />}
                placeholder="••••••••"
                inputSize="lg"
                required
              />
            </div>

            {error && (
              <div
                role="alert"
                className="rounded-md bg-danger-soft border border-danger/30 text-danger text-[12.5px] px-3 py-2"
              >
                {error}
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              loading={loading}
              leftIcon={<Stethoscope />}
            >
              Create account
            </Button>

            <div className="text-center text-[12.5px] text-ink-3">
              Already have an account?{' '}
              <Link to="/login" className="text-accent-ink font-semibold hover:underline">
                Sign in
              </Link>
            </div>
          </form>

          <div className="mt-6 pt-5 border-t border-line text-[11px] text-ink-3 flex items-center gap-2">
            <ShieldCheck className="h-3.5 w-3.5 text-accent" />
            Passwords are hashed with bcrypt. Session is a short-lived JWT in an
            HTTP-only cookie.
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
              Your whole practice, one screen.
            </div>
            <p className="text-[14px] text-white/85 leading-relaxed">
              AI drafts the Rx, you focus on the patient. Appointments, video
              consults, lab results, and billing all live together — and new
              doctors onboard in under five minutes.
            </p>
            <ul className="mt-6 space-y-2 text-[13px] text-white/90">
              <li>✓ Free 14-day Pro trial, no card required</li>
              <li>✓ Chambers, schedules, and team seats in onboarding</li>
              <li>✓ Cancel any time from the billing page</li>
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
