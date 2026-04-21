import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, Check, Languages, Palette, Printer, ShieldCheck } from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { Card, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Select';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import {
  DEFAULT_SETTINGS,
  settingsService,
  type DoctorSettings,
} from '../services/settingsService';
import { useAuthStore } from '../stores/authStore';
import { useSettingsStore } from '../stores/settingsStore';

type Notifications = NonNullable<DoctorSettings['notifications']>;
type Printing = NonNullable<DoctorSettings['printing']>;
type Theme = NonNullable<DoctorSettings['theme']>;

export function Settings() {
  const logout = useAuthStore((s) => s.logout);
  const qc = useQueryClient();
  const [savedFlash, setSavedFlash] = useState(false);

  const { data } = useQuery({
    queryKey: ['doctor-settings'],
    queryFn: () => settingsService.get(),
  });

  const merged: DoctorSettings = useMemo(
    () => ({
      ...DEFAULT_SETTINGS,
      ...(data?.settings ?? {}),
      notifications: {
        ...DEFAULT_SETTINGS.notifications,
        ...(data?.settings.notifications ?? {}),
      },
      printing: {
        ...DEFAULT_SETTINGS.printing,
        ...(data?.settings.printing ?? {}),
      },
      theme: {
        ...DEFAULT_SETTINGS.theme,
        ...(data?.settings.theme ?? {}),
      },
    }),
    [data],
  );

  const setStore = useSettingsStore((s) => s.setSettings);
  const update = useMutation({
    mutationFn: (patch: DoctorSettings) => settingsService.update(patch),
    onSuccess: (res) => {
      qc.setQueryData(['doctor-settings'], res);
      setStore(res.settings);
      setSavedFlash(true);
    },
  });

  useEffect(() => {
    if (!savedFlash) return;
    const t = setTimeout(() => setSavedFlash(false), 1400);
    return () => clearTimeout(t);
  }, [savedFlash]);

  const patch = (p: DoctorSettings) => update.mutate(p);
  const patchNotif = (p: Partial<Notifications>) =>
    patch({ notifications: p });
  const patchPrint = (p: Partial<Printing>) => patch({ printing: p });
  const patchTheme = (p: Partial<Theme>) => patch({ theme: p });

  const [pwdOpen, setPwdOpen] = useState(false);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Settings"
        description="Preferences for notifications, language, printing, and security."
        actions={
          savedFlash ? (
            <span className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-success">
              <Check className="h-3.5 w-3.5" /> Saved
            </span>
          ) : null
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card>
          <CardHeader title="Language & region" icon={<Languages />} />
          <div className="p-5 space-y-4 text-[13px]">
            <SelectRow
              label="Interface language"
              value={merged.interfaceLanguage ?? 'en'}
              onChange={(v) => patch({ interfaceLanguage: v as 'en' | 'bn' })}
              options={[
                { value: 'en', label: 'English' },
                { value: 'bn', label: 'বাংলা' },
              ]}
            />
            <SelectRow
              label="Prescription language"
              value={merged.rxLanguage ?? 'bilingual'}
              onChange={(v) =>
                patch({ rxLanguage: v as 'en' | 'bn' | 'bilingual' })
              }
              options={[
                { value: 'en', label: 'English' },
                { value: 'bn', label: 'বাংলা' },
                { value: 'bilingual', label: 'English + বাংলা' },
              ]}
            />
            <SelectRow
              label="Date format"
              value={merged.dateFormat ?? 'dd MMM yyyy'}
              onChange={(v) => patch({ dateFormat: v as DoctorSettings['dateFormat'] })}
              options={[
                { value: 'dd MMM yyyy', label: '21 Apr 2026' },
                { value: 'yyyy-MM-dd', label: '2026-04-21' },
                { value: 'MM/dd/yyyy', label: '04/21/2026' },
              ]}
            />
            <SelectRow
              label="Time format"
              value={merged.timeFormat ?? '12h'}
              onChange={(v) => patch({ timeFormat: v as '12h' | '24h' })}
              options={[
                { value: '12h', label: '12-hour (4:30 PM)' },
                { value: '24h', label: '24-hour (16:30)' },
              ]}
            />
          </div>
        </Card>

        <Card>
          <CardHeader title="Notifications" icon={<Bell />} />
          <div className="p-5 space-y-3 text-[13px]">
            <Toggle
              label="Appointment confirmations"
              on={merged.notifications?.appointmentConfirmations ?? true}
              onChange={(v) => patchNotif({ appointmentConfirmations: v })}
            />
            <Toggle
              label="Lab report uploaded"
              on={merged.notifications?.labUploaded ?? true}
              onChange={(v) => patchNotif({ labUploaded: v })}
            />
            <Toggle
              label="Patient reschedules"
              on={merged.notifications?.patientReschedules ?? true}
              onChange={(v) => patchNotif({ patientReschedules: v })}
            />
          </div>
        </Card>

        <Card>
          <CardHeader title="Printing" icon={<Printer />} />
          <div className="p-5 space-y-3 text-[13px]">
            <SelectRow
              label="Default paper size"
              value={merged.printing?.paperSize ?? 'A5'}
              onChange={(v) => patchPrint({ paperSize: v as 'A4' | 'A5' })}
              options={[
                { value: 'A5', label: 'A5 (148×210 mm)' },
                { value: 'A4', label: 'A4 (210×297 mm)' },
              ]}
            />
            <SelectRow
              label="Letterhead template"
              value={merged.printing?.letterhead ?? 'Clinical & calm (default)'}
              onChange={(v) => patchPrint({ letterhead: v })}
              options={[
                { value: 'Clinical & calm (default)', label: 'Clinical & calm (default)' },
                { value: 'Minimal monochrome', label: 'Minimal monochrome' },
                { value: 'Modern colour band', label: 'Modern colour band' },
              ]}
            />
          </div>
        </Card>

        <Card>
          <CardHeader title="Theme" icon={<Palette />} />
          <div className="p-5 space-y-3 text-[13px]">
            <SelectRow
              label="Appearance"
              value={merged.theme?.appearance ?? 'light'}
              onChange={(v) => patchTheme({ appearance: v as 'light' | 'dark' })}
              options={[
                { value: 'light', label: 'Light (clinical teal)' },
                { value: 'dark', label: 'Dark (after-hours)' },
              ]}
            />
            <SelectRow
              label="Accent density"
              value={merged.theme?.density ?? 'comfortable'}
              onChange={(v) =>
                patchTheme({ density: v as 'compact' | 'comfortable' })
              }
              options={[
                { value: 'comfortable', label: 'Comfortable' },
                { value: 'compact', label: 'Compact' },
              ]}
            />
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader title="Security" icon={<ShieldCheck />} />
          <div className="p-5 text-[13px]">
            <Row label="Password" value="Change your account password" />
          </div>
          <div className="px-5 pb-5 flex items-center gap-2">
            <Button variant="secondary" onClick={() => setPwdOpen(true)}>
              Change password
            </Button>
            <Button variant="ghost" onClick={() => logout()}>
              Sign out
            </Button>
          </div>
        </Card>
      </div>

      <ChangePasswordModal open={pwdOpen} onClose={() => setPwdOpen(false)} />
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10.5px] font-bold uppercase tracking-[1.2px] text-ink-3">
        {label}
      </div>
      <div className="mt-1 text-ink">{value}</div>
    </div>
  );
}

function SelectRow({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-ink-3">{label}</span>
      <div className="w-[240px]">
        <Select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          options={options}
        />
      </div>
    </div>
  );
}

function Toggle({
  label,
  on,
  onChange,
}: {
  label: string;
  on: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      className="flex items-center justify-between w-full text-left"
      onClick={() => onChange(!on)}
    >
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
    </button>
  );
}

function ChangePasswordModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const mut = useMutation({
    mutationFn: () => settingsService.changePassword(current, next),
    onSuccess: () => {
      setDone(true);
      setTimeout(() => {
        setDone(false);
        setCurrent('');
        setNext('');
        setConfirm('');
        onClose();
      }, 900);
    },
    onError: (e: { message?: string }) =>
      setError(e?.message ?? 'Could not change password.'),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (next.length < 8) {
      setError('New password must be at least 8 characters.');
      return;
    }
    if (next !== confirm) {
      setError("New password and confirmation don't match.");
      return;
    }
    mut.mutate();
  };

  return (
    <Modal open={open} onClose={onClose} size="sm" title="Change password">
      <form onSubmit={submit} className="flex flex-col gap-3">
        <Input
          type="password"
          label="Current password"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          required
          autoFocus
        />
        <Input
          type="password"
          label="New password"
          value={next}
          onChange={(e) => setNext(e.target.value)}
          required
        />
        <Input
          type="password"
          label="Confirm new password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
        />
        {error && (
          <div className="rounded-md bg-danger-soft border border-danger/30 text-danger text-[12.5px] px-3 py-2">
            {error}
          </div>
        )}
        {done && (
          <div className="rounded-md bg-success-soft border border-success/30 text-success text-[12.5px] px-3 py-2">
            Password updated.
          </div>
        )}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-line">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={mut.isPending}>
            Update password
          </Button>
        </div>
      </form>
    </Modal>
  );
}
