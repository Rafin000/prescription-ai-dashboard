import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Upload, X } from 'lucide-react';
import { StepHeader } from './StepHeader';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useAuthStore } from '../../stores/authStore';
import { useSaveOnboardingProfile } from '../../queries/hooks';

export function OnboardingProfile() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const save = useSaveOnboardingProfile();

  const [name, setName] = useState('');
  const [nameBn, setNameBn] = useState('');
  const [bmdcNo, setBmdcNo] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [degrees, setDegrees] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [signatureUrl, setSignatureUrl] = useState<string | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    setName(user.name ?? '');
    setNameBn(user.nameBn ?? '');
    setBmdcNo(user.bmdcNo ?? '');
    setSpecialty(user.specialty ?? '');
    setDegrees((user.degrees ?? []).join(', '));
    setPhone(user.phone ?? '');
    setEmail(user.email ?? '');
    setSignatureUrl(user.signatureUrl);
  }, [user]);

  const handleSig = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setSignatureUrl(reader.result as string);
    reader.readAsDataURL(file);
  };

  const submit = async () => {
    setError(null);
    if (!name.trim()) return setError('Your name is required.');
    if (!bmdcNo.trim()) return setError('BMDC registration is required.');
    try {
      await save.mutateAsync({
        name: name.trim(),
        nameBn: nameBn.trim() || undefined,
        bmdcNo: bmdcNo.trim(),
        specialty: specialty.trim(),
        degrees: degrees
          .split(',')
          .map((d) => d.trim())
          .filter(Boolean),
        phone: phone.trim(),
        email: email.trim(),
        signatureUrl,
      });
      navigate('/onboarding/chambers');
    } catch (err) {
      setError((err as { message?: string })?.message ?? 'Could not save your profile.');
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <StepHeader
        eyebrow="Step 1 of 6"
        title="Tell us about yourself"
        description="This goes on every prescription and the patient-facing details. You can change anything here later from your doctor profile."
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input label="Full name (English)" value={name} onChange={(e) => setName(e.target.value)} required />
        <Input
          label="Full name (Bangla)"
          value={nameBn}
          onChange={(e) => setNameBn(e.target.value)}
          placeholder="Optional, for printed Rx"
        />
        <Input
          label="BMDC registration #"
          value={bmdcNo}
          onChange={(e) => setBmdcNo(e.target.value)}
          required
        />
        <Input
          label="Specialty"
          value={specialty}
          onChange={(e) => setSpecialty(e.target.value)}
          placeholder="e.g. Consultant Cardiologist"
        />
        <Input
          label="Degrees (comma-separated)"
          value={degrees}
          onChange={(e) => setDegrees(e.target.value)}
          placeholder="MBBS, FCPS (Medicine), MD (Cardiology)"
          wrapperClassName="sm:col-span-2"
        />
        <Input label="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
        <Input label="Email" value={email} onChange={(e) => setEmail(e.target.value)} type="email" />
      </div>

      <div>
        <div className="text-[11px] font-semibold text-ink-2 mb-1.5">
          Signature (used on every printed Rx)
        </div>
        {signatureUrl ? (
          <div className="rounded-lg border border-line bg-surface p-3 flex items-center gap-4">
            <img
              src={signatureUrl}
              alt="Signature"
              className="h-16 max-w-[260px] object-contain border border-line rounded-md bg-bg-muted"
            />
            <button
              type="button"
              onClick={() => setSignatureUrl(undefined)}
              className="inline-flex items-center gap-1 text-[12px] font-semibold text-danger hover:underline"
            >
              <X className="h-3 w-3" />
              Remove
            </button>
          </div>
        ) : (
          <label className="rounded-lg border-2 border-dashed border-line bg-surface p-5 grid place-items-center cursor-pointer hover:border-line-strong">
            <input type="file" accept="image/*" onChange={handleSig} className="hidden" />
            <div className="text-center">
              <Upload className="h-5 w-5 mx-auto text-ink-3" />
              <div className="mt-2 text-[12.5px] font-semibold text-ink">
                Upload signature image
              </div>
              <div className="text-[11px] text-ink-3 mt-0.5">
                PNG/JPG with a transparent or white background works best.
              </div>
            </div>
          </label>
        )}
      </div>

      {error && (
        <div className="rounded-md bg-danger-soft border border-danger/30 text-danger text-[12.5px] px-3 py-2">
          {error}
        </div>
      )}

      <div className="flex items-center justify-end gap-2 pt-2 border-t border-line">
        <Button
          variant="primary"
          rightIcon={<ArrowRight />}
          loading={save.isPending}
          onClick={submit}
        >
          Save &amp; continue
        </Button>
      </div>
    </div>
  );
}
