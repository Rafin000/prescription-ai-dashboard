import { useEffect, useState, type FormEvent } from 'react';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { Button } from '../ui/Button';
import { apiPatch } from '../../lib/http';
import type { Doctor } from '../../types';

interface Props {
  open: boolean;
  onClose: () => void;
  doctor: Doctor;
  onSaved: (next: Doctor) => void;
}

interface Draft {
  name: string;
  nameBn: string;
  specialty: string;
  bmdcNo: string;
  phone: string;
  email: string;
  degrees: string;
}

const toDraft = (d: Doctor): Draft => ({
  name: d.name,
  nameBn: d.nameBn ?? '',
  specialty: d.specialty,
  bmdcNo: d.bmdcNo,
  phone: d.phone,
  email: d.email,
  degrees: (d.degrees ?? []).join(', '),
});

export function EditProfileModal({ open, onClose, doctor, onSaved }: Props) {
  const [d, setD] = useState<Draft>(toDraft(doctor));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setD(toDraft(doctor));
      setError(null);
    }
  }, [open, doctor]);

  const upd = <K extends keyof Draft>(k: K, v: Draft[K]) =>
    setD((p) => ({ ...p, [k]: v }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const body = {
        name: d.name.trim(),
        nameBn: d.nameBn.trim() || undefined,
        specialty: d.specialty.trim(),
        bmdcNo: d.bmdcNo.trim() || undefined,
        phone: d.phone.trim() || undefined,
        email: d.email.trim() || undefined,
        degrees: d.degrees
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
      };
      const next = await apiPatch<Doctor, typeof body>('/doctor/me', body);
      onSaved(next);
      onClose();
    } catch (err) {
      setError((err as { message?: string })?.message ?? 'Could not save profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      title="Edit profile"
      description="This information appears on the prescription letterhead and your patient-facing booking card."
    >
      <form onSubmit={submit} className="flex flex-col gap-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Input
            label="Full name *"
            value={d.name}
            onChange={(e) => upd('name', e.target.value)}
            required
          />
          <Input
            label="Name (Bangla)"
            value={d.nameBn}
            onChange={(e) => upd('nameBn', e.target.value)}
            placeholder="ডা. আশরাফুল করিম"
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Input
            label="Specialty *"
            value={d.specialty}
            onChange={(e) => upd('specialty', e.target.value)}
            required
          />
          <Input
            label="BMDC number"
            value={d.bmdcNo}
            onChange={(e) => upd('bmdcNo', e.target.value)}
            placeholder="A-12345"
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Input
            label="Phone"
            value={d.phone}
            onChange={(e) => upd('phone', e.target.value)}
            placeholder="+880 1XXX-XXX XXX"
          />
          <Input
            label="Email"
            value={d.email}
            onChange={(e) => upd('email', e.target.value)}
            type="email"
          />
        </div>
        <Textarea
          label="Degrees (comma-separated)"
          value={d.degrees}
          onChange={(e) => upd('degrees', e.target.value)}
          rows={2}
          placeholder="MBBS, FCPS (Medicine), MD (Cardiology)"
        />
        {error && (
          <div className="rounded-md bg-danger-soft border border-danger/30 text-danger text-[12.5px] px-3 py-2">
            {error}
          </div>
        )}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-line">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={saving}>
            Save changes
          </Button>
        </div>
      </form>
    </Modal>
  );
}
