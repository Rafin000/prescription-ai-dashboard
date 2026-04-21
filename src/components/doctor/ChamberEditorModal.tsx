import { useEffect, useState, type FormEvent } from 'react';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import type { Chamber } from '../../types';
import type { ChamberInput } from '../../services/chambersService';

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (body: ChamberInput) => Promise<void>;
  initial?: Chamber | null;
}

interface Draft {
  name: string;
  address: string;
  phone: string;
  area: string;
  city: string;
  timeLabel: string;
  lat: string;
  lng: string;
}

const toDraft = (c?: Chamber | null): Draft => ({
  name: c?.name ?? '',
  address: c?.address ?? '',
  phone: c?.phone ?? '',
  area: c?.area ?? '',
  city: c?.city ?? '',
  timeLabel: c?.time ?? '',
  lat: c?.lat != null ? String(c.lat) : '',
  lng: c?.lng != null ? String(c.lng) : '',
});

export function ChamberEditorModal({ open, onClose, onSave, initial }: Props) {
  const [d, setD] = useState<Draft>(toDraft(initial));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setD(toDraft(initial));
      setError(null);
    }
  }, [open, initial]);

  const upd = <K extends keyof Draft>(k: K, v: Draft[K]) =>
    setD((p) => ({ ...p, [k]: v }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!d.name.trim() || !d.address.trim()) {
      setError('Name and address are required.');
      return;
    }
    const latNum = d.lat.trim() ? Number(d.lat) : undefined;
    const lngNum = d.lng.trim() ? Number(d.lng) : undefined;
    if (latNum !== undefined && (Number.isNaN(latNum) || latNum < -90 || latNum > 90)) {
      setError('Latitude must be between -90 and 90.');
      return;
    }
    if (lngNum !== undefined && (Number.isNaN(lngNum) || lngNum < -180 || lngNum > 180)) {
      setError('Longitude must be between -180 and 180.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave({
        name: d.name.trim(),
        address: d.address.trim(),
        phone: d.phone.trim() || undefined,
        area: d.area.trim() || undefined,
        city: d.city.trim() || undefined,
        timeLabel: d.timeLabel.trim() || undefined,
        lat: latNum,
        lng: lngNum,
      });
      onClose();
    } catch (err) {
      setError((err as { message?: string })?.message ?? 'Could not save chamber.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      title={initial ? 'Edit chamber' : 'Add chamber'}
      description="Where you see patients. Appears on your public directory card and the Rx letterhead."
    >
      <form onSubmit={submit} className="flex flex-col gap-3">
        <Input
          label="Name *"
          value={d.name}
          onChange={(e) => upd('name', e.target.value)}
          placeholder="Popular Diagnostic — Dhanmondi"
          required
        />
        <Input
          label="Address *"
          value={d.address}
          onChange={(e) => upd('address', e.target.value)}
          placeholder="House 16, Road 2, Dhanmondi, Dhaka 1205"
          required
        />
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Phone"
            value={d.phone}
            onChange={(e) => upd('phone', e.target.value)}
            placeholder="+880 2-9666-787 555"
          />
          <Input
            label="Hours label"
            value={d.timeLabel}
            onChange={(e) => upd('timeLabel', e.target.value)}
            placeholder="6:00 PM – 9:00 PM"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Area"
            value={d.area}
            onChange={(e) => upd('area', e.target.value)}
            placeholder="Dhanmondi"
          />
          <Input
            label="City"
            value={d.city}
            onChange={(e) => upd('city', e.target.value)}
            placeholder="Dhaka"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Latitude"
            value={d.lat}
            onChange={(e) => upd('lat', e.target.value)}
            inputMode="decimal"
            placeholder="23.7461"
          />
          <Input
            label="Longitude"
            value={d.lng}
            onChange={(e) => upd('lng', e.target.value)}
            inputMode="decimal"
            placeholder="90.376"
          />
        </div>
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
            {initial ? 'Save changes' : 'Add chamber'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
