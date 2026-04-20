import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  AtSign,
  CheckCircle2,
  Loader2,
  Lock,
  Phone,
  ShieldCheck,
  UserPlus,
} from 'lucide-react';
import { BrandMark } from '../components/layout/BrandMark';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { teamService } from '../services/teamService';
import { usePublicInvite } from '../queries/hooks';
import {
  SYSTEM_ROLE_DESCRIPTIONS,
  SYSTEM_ROLE_LABELS,
  isSystemRole,
} from '../lib/permissions';
import { fmtRelative } from '../lib/format';

export function InviteAccept() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [accepted, setAccepted] = useState(false);

  const { data: invite, isLoading, error: loadError } = usePublicInvite(token);

  // Auto-redirect to login after success.
  useEffect(() => {
    if (!accepted) return;
    const t = window.setTimeout(() => navigate('/login', { replace: true }), 3500);
    return () => window.clearTimeout(t);
  }, [accepted, navigate]);

  if (isLoading) {
    return <Splash message="Checking your invite…" />;
  }

  if (loadError || !invite) {
    const msg =
      (loadError as { message?: string })?.message ??
      'This invite link is invalid or has already been used.';
    return (
      <InvalidLink
        title="Invite unavailable"
        message={msg}
      />
    );
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setError(null);
    if (!name.trim()) {
      setError('Please enter your name.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setSubmitting(true);
    try {
      await teamService.accept({ token, name: name.trim(), password, phone: phone.trim() || undefined });
      setAccepted(true);
    } catch (err) {
      const m = (err as { message?: string })?.message ?? 'Could not accept the invite.';
      setError(m);
    } finally {
      setSubmitting(false);
    }
  };

  if (accepted) {
    return (
      <div className="min-h-screen grid place-items-center bg-bg px-6 py-10">
        <div className="max-w-md text-center">
          <div className="h-14 w-14 rounded-full bg-success-soft text-success grid place-items-center mx-auto">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <h1 className="font-serif text-[22px] font-semibold text-ink mt-4 leading-tight">
            You're in, {name.split(' ')[0]}.
          </h1>
          <p className="text-[13.5px] text-ink-2 mt-2 leading-relaxed">
            Welcome to <b className="font-semibold text-ink">{invite.team.name}</b>. Sign in
            with your new password to start.
          </p>
          <Link to="/login" className="inline-block mt-5">
            <Button variant="primary" leftIcon={<ShieldCheck />}>
              Go to sign in
            </Button>
          </Link>
          <div className="text-[11.5px] text-ink-3 mt-3">
            Redirecting automatically in a moment…
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-[1fr_1fr] bg-bg">
      <div className="flex items-center justify-center px-6 py-10">
        <div className="w-full max-w-[440px]">
          <BrandMark />

          <div className="mt-6 inline-flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[1.4px] text-accent-ink bg-accent-softer border border-accent/20 rounded-full px-2.5 py-1">
            <UserPlus className="h-3 w-3" />
            You've been invited
          </div>

          <h1 className="font-serif text-[26px] font-semibold text-ink leading-tight mt-4">
            Join <span className="text-accent-ink">{invite.team.name}</span>
          </h1>
          <p className="text-[13.5px] text-ink-2 mt-2 max-w-md leading-relaxed">
            <b className="font-semibold">{invite.invitedBy.name}</b> invited you as{' '}
            <b className="font-semibold">
              {isSystemRole(invite.role) ? SYSTEM_ROLE_LABELS[invite.role] : invite.role}
            </b>
            . Set up your
            account below — no separate sign-up needed.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
            <Input
              label="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Samira Khan"
              inputSize="lg"
              required
              autoFocus
            />

            <Input
              label="Email"
              value={invite.email}
              leftIcon={<AtSign />}
              inputSize="lg"
              disabled
              hint="Bound to this invite link — can't be changed."
            />

            <Input
              label="Phone (optional)"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              leftIcon={<Phone />}
              type="tel"
              placeholder="+880 1XXX-XXX XXX"
              inputSize="lg"
            />

            <Input
              label="Create a password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              leftIcon={<Lock />}
              placeholder="At least 6 characters"
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

            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              loading={submitting}
              leftIcon={<ShieldCheck />}
            >
              Accept invite &amp; join
            </Button>
          </form>

          <div className="mt-5 text-[11px] text-ink-3">
            Invite expires {fmtRelative(invite.expiresAt)}. By joining you agree to your
            clinic's workspace policies.
          </div>
        </div>
      </div>

      <div className="hidden lg:flex relative bg-gradient-to-br from-accent to-accent-hover overflow-hidden">
        <div className="absolute inset-0 opacity-20 [background-image:radial-gradient(circle_at_20%_10%,rgba(255,255,255,0.35),transparent_35%),radial-gradient(circle_at_85%_80%,rgba(255,255,255,0.2),transparent_40%)]" />
        <div className="relative z-10 flex flex-col justify-between p-12 text-white w-full">
          <div className="text-[11px] font-bold uppercase tracking-[1.8px] text-accent-soft">
            Prescription AI · your new workspace
          </div>
          <div className="max-w-md">
            <div className="font-serif text-[26px] font-semibold leading-tight mb-3">
              What you'll be doing as{' '}
              {isSystemRole(invite.role) ? SYSTEM_ROLE_LABELS[invite.role] : invite.role}
            </div>
            <p className="text-[13.5px] text-white/85 leading-relaxed">
              {isSystemRole(invite.role)
                ? SYSTEM_ROLE_DESCRIPTIONS[invite.role]
                : 'A custom role set up by your workspace admin.'}
            </p>
            <ul className="mt-5 space-y-2 text-[13px] text-white/85">
              <li>✓ Single sign-in for the whole clinic</li>
              <li>✓ Activity visible to the admin in real time</li>
              <li>✓ Your actions audit-logged for compliance</li>
            </ul>
          </div>
          <div className="text-[11px] text-white/70 font-mono">
            Secured with encrypted tokens · invites expire in 7 days
          </div>
        </div>
      </div>
    </div>
  );
}

function Splash({ message }: { message: string }) {
  return (
    <div className="min-h-screen grid place-items-center bg-bg">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-6 w-6 animate-spin text-accent" />
        <div className="text-[12px] text-ink-3 font-mono uppercase tracking-[1.4px]">
          {message}
        </div>
      </div>
    </div>
  );
}

function InvalidLink({ title, message }: { title: string; message: string }) {
  return (
    <div className="min-h-screen grid place-items-center bg-bg px-6">
      <div className="max-w-md text-center">
        <div className="h-14 w-14 rounded-full bg-danger-soft border border-danger/30 text-danger grid place-items-center mx-auto">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <h1 className="font-serif text-[22px] font-semibold text-ink mt-4 leading-tight">
          {title}
        </h1>
        <p className="text-[13.5px] text-ink-2 mt-2 leading-relaxed">{message}</p>
        <Link to="/login" className="inline-block mt-5">
          <Button variant="secondary">Go to sign in</Button>
        </Link>
      </div>
    </div>
  );
}
