import { useRef, useState, type ChangeEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { PenLine, Trash2, Upload } from 'lucide-react';
import { Button } from '../ui/Button';
import { doctorService } from '../../services/doctorService';
import { useAuthStore } from '../../stores/authStore';
import { resolveAsset } from '../../config/env';
import type { Doctor } from '../../types';

interface SignatureCardProps {
  doctor: Doctor;
}

const MAX_BYTES = 2_000_000; // 2 MB — matches backend cap
const ACCEPT = 'image/png,image/jpeg,image/webp,image/svg+xml';

export function SignatureCard({ doctor }: SignatureCardProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [bust, setBust] = useState(() => Date.now());
  const qc = useQueryClient();
  const setUser = useAuthStore((s) => s.setUser);

  const invalidateProfile = async () => {
    await qc.invalidateQueries({
      predicate: (q) =>
        Array.isArray(q.queryKey) && q.queryKey[0] === 'current-doctor',
    });
    const next = await doctorService.getCurrent();
    setUser(next);
    setBust(Date.now());
  };

  const upload = useMutation({
    mutationFn: (file: File) => doctorService.uploadSignature(file),
    onSuccess: invalidateProfile,
    onError: (e: { message?: string }) =>
      setError(e?.message ?? 'Upload failed. Please try again.'),
  });

  const clear = useMutation({
    mutationFn: () => doctorService.update({ signatureUrl: '' }),
    onSuccess: invalidateProfile,
  });

  const isPending = upload.isPending || clear.isPending;

  const handleFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setError(null);

    if (!ACCEPT.split(',').includes(file.type)) {
      setError('Please choose a PNG, JPG, WEBP, or SVG file.');
      return;
    }
    if (file.size > MAX_BYTES) {
      setError('Signature must be under 2 MB.');
      return;
    }
    upload.mutate(file);
  };

  const remove = () => {
    setError(null);
    clear.mutate();
  };

  const sigSrc = resolveAsset(
    doctor.signatureUrl ? `${doctor.signatureUrl}?v=${bust}` : undefined,
  );

  return (
    <div className="bg-surface border border-line rounded-xl shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-line">
        <div className="inline-flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[1.4px] text-accent-ink">
          <PenLine className="h-3.5 w-3.5" />
          Signature
        </div>
        <span className="text-[11px] text-ink-3">
          Appears on every prescription you finalise
        </span>
      </div>

      <div className="p-5 flex flex-col md:flex-row gap-5 items-start">
        <div
          className="flex items-center justify-center w-full md:w-[280px] h-[140px] rounded-lg border border-dashed border-line bg-surface-muted px-5"
          style={{
            backgroundImage:
              'repeating-linear-gradient(-45deg, #FAFDFB, #FAFDFB 8px, #F3F7F5 8px, #F3F7F5 16px)',
          }}
        >
          {sigSrc ? (
            <img
              src={sigSrc}
              alt={`${doctor.name} signature`}
              className="max-h-full max-w-full object-contain"
            />
          ) : (
            <div className="text-center">
              <div className="font-serif italic text-[22px] text-ink-3 leading-tight">
                {doctor.name}
              </div>
              <div className="text-[10px] font-bold uppercase tracking-[1.2px] text-ink-3 mt-2">
                Preview · printed name (no upload yet)
              </div>
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0 flex flex-col gap-3">
          <div>
            <div className="font-serif text-[15px] font-semibold text-ink mb-1">
              Upload your signature
            </div>
            <p className="text-[12.5px] text-ink-2 leading-relaxed">
              Ideally a transparent PNG of your handwritten signature. Keep it around
              600×200px — the Rx pad renders it at 200px wide. PNG, JPG, WEBP, or SVG up
              to 2 MB.
            </p>
          </div>

          {error && (
            <div className="rounded-md bg-danger-soft border border-danger/30 text-danger text-[12px] px-3 py-2">
              {error}
            </div>
          )}

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="primary"
              leftIcon={<Upload />}
              loading={isPending}
              onClick={() => inputRef.current?.click()}
            >
              {doctor.signatureUrl ? 'Replace signature' : 'Upload signature'}
            </Button>
            {doctor.signatureUrl && (
              <Button
                variant="ghost"
                leftIcon={<Trash2 />}
                onClick={remove}
                disabled={isPending}
              >
                Remove
              </Button>
            )}
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPT}
              className="hidden"
              onChange={handleFile}
            />
          </div>

          <div className="text-[11px] text-ink-3 mt-1 leading-relaxed">
            Tip: scan your signature on white paper, then erase the background so it
            blends into the prescription letterhead.
          </div>
        </div>
      </div>
    </div>
  );
}
