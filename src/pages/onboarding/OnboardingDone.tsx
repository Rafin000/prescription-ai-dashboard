import { useNavigate } from 'react-router-dom';
import { ArrowRight, Check, Sparkles } from 'lucide-react';
import { StepHeader } from './StepHeader';
import { Button } from '../../components/ui/Button';
import { useAuthStore } from '../../stores/authStore';

const NEXT = [
  { title: 'Open the dashboard', body: 'See today\'s appointments, pending lab reports, and quick stats.' },
  { title: 'Start a consult', body: 'Hit "Start new consult" in the top bar — pick in-person or video.' },
  { title: 'Customise more', body: 'Fine-tune templates, role permissions, and chambers from Settings.' },
];

export function OnboardingDone() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  return (
    <div className="flex flex-col gap-8 items-center text-center pt-6">
      <div className="relative">
        <span aria-hidden className="absolute inset-0 rounded-full bg-accent/20 animate-pulse-ring" />
        <div className="relative h-16 w-16 rounded-full bg-accent text-white grid place-items-center">
          <Check className="h-7 w-7" />
        </div>
      </div>

      <StepHeader
        eyebrow={
          <span className="inline-flex items-center justify-center gap-1.5">
            <Sparkles className="h-3 w-3" />
            You're all set
          </span>
        }
        title={`Welcome aboard, ${user?.name?.split(' ')[1] ?? 'doctor'}.`}
        description="Your profile, chambers, and subscription are live. Patients can now book inside your availability — and the AI is ready when you start your first consult."
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full">
        {NEXT.map((n) => (
          <div key={n.title} className="rounded-lg border border-line bg-surface p-4 text-left">
            <div className="font-serif text-[14.5px] font-semibold text-ink">{n.title}</div>
            <p className="text-[12px] text-ink-2 mt-1.5 leading-relaxed">{n.body}</p>
          </div>
        ))}
      </div>

      <Button variant="primary" rightIcon={<ArrowRight />} onClick={() => navigate('/')}>
        Go to dashboard
      </Button>
    </div>
  );
}
