import { useRef, useState, type ChangeEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Camera,
  CheckCircle2,
  Edit3,
  Mail,
  MapPin,
  Phone,
  Plus,
  Trash2,
} from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { Card, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Avatar } from '../components/ui/Avatar';
import { SignatureCard } from '../components/doctor/SignatureCard';
import { EditProfileModal } from '../components/doctor/EditProfileModal';
import { ChamberEditorModal } from '../components/doctor/ChamberEditorModal';
import { useCurrentDoctor } from '../queries/hooks';
import { useAuthStore } from '../stores/authStore';
import { chambersService, type ChamberInput } from '../services/chambersService';
import { doctorService } from '../services/doctorService';
import { resolveAsset } from '../config/env';
import type { Chamber, Doctor } from '../types';

const AVATAR_ACCEPT = 'image/png,image/jpeg,image/webp';
const AVATAR_MAX_BYTES = 2_000_000;

export function DoctorProfile() {
  const { data: doctor } = useCurrentDoctor();
  const setUser = useAuthStore((s) => s.setUser);
  const qc = useQueryClient();

  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [chamberOpen, setChamberOpen] = useState(false);
  const [chamberEditing, setChamberEditing] = useState<Chamber | null>(null);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [avatarBust, setAvatarBust] = useState(() => Date.now());
  const avatarInputRef = useRef<HTMLInputElement | null>(null);

  const invalidate = () =>
    qc.invalidateQueries({
      predicate: (q) =>
        Array.isArray(q.queryKey) && q.queryKey[0] === 'current-doctor',
    });

  const uploadAvatar = useMutation({
    mutationFn: (file: File) => doctorService.uploadAvatar(file),
    onSuccess: async () => {
      const next = await doctorService.getCurrent();
      setUser(next);
      setAvatarBust(Date.now());
      invalidate();
    },
    onError: (e: { message?: string }) =>
      setAvatarError(e?.message ?? 'Upload failed. Please try again.'),
  });

  const onAvatarChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setAvatarError(null);
    if (!AVATAR_ACCEPT.split(',').includes(file.type)) {
      setAvatarError('Please choose a PNG, JPG, or WEBP image.');
      return;
    }
    if (file.size > AVATAR_MAX_BYTES) {
      setAvatarError('Photo must be under 2 MB.');
      return;
    }
    uploadAvatar.mutate(file);
  };

  const createChamber = useMutation({
    mutationFn: (body: ChamberInput) => chambersService.create(body),
    onSuccess: invalidate,
  });
  const updateChamber = useMutation({
    mutationFn: ({ id, body }: { id: string; body: ChamberInput }) =>
      chambersService.update(id, body),
    onSuccess: invalidate,
  });
  const deleteChamber = useMutation({
    mutationFn: (id: string) => chambersService.remove(id),
    onSuccess: invalidate,
  });

  if (!doctor) return <div className="text-[13px] text-ink-3">Loading profile…</div>;

  const openAdd = () => {
    setChamberEditing(null);
    setChamberOpen(true);
  };
  const openEdit = (c: Chamber) => {
    setChamberEditing(c);
    setChamberOpen(true);
  };
  const handleChamberSave = async (body: ChamberInput) => {
    if (chamberEditing) {
      await updateChamber.mutateAsync({ id: chamberEditing.id, body });
    } else {
      await createChamber.mutateAsync(body);
    }
  };
  const handleChamberDelete = (c: Chamber) => {
    if (
      window.confirm(
        `Remove "${c.name}"? Patients won't see it on your public card.`,
      )
    ) {
      deleteChamber.mutate(c.id);
    }
  };

  const onProfileSaved = (next: Doctor) => {
    setUser(next);
    invalidate();
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Doctor profile"
        description="This information appears on your prescription letterhead and your patient-facing booking page."
        actions={
          <Button
            variant="primary"
            leftIcon={<Edit3 />}
            onClick={() => setEditProfileOpen(true)}
          >
            Edit profile
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.4fr] gap-5">
        <Card>
          <div className="p-6 flex flex-col items-center text-center">
            <div className="relative">
              <Avatar
                name={doctor.name}
                size="xl"
                ring
                src={resolveAsset(
                  doctor.avatarUrl
                    ? `${doctor.avatarUrl}?v=${avatarBust}`
                    : undefined,
                )}
              />
              <button
                type="button"
                className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full bg-accent text-white grid place-items-center shadow-sm hover:bg-accent/90 disabled:opacity-60"
                aria-label="Change photo"
                onClick={() => avatarInputRef.current?.click()}
                disabled={uploadAvatar.isPending}
              >
                <Camera className="h-4 w-4" />
              </button>
              <input
                ref={avatarInputRef}
                type="file"
                accept={AVATAR_ACCEPT}
                className="hidden"
                onChange={onAvatarChange}
              />
            </div>
            {avatarError && (
              <div className="mt-2 rounded-md bg-danger-soft border border-danger/30 text-danger text-[11.5px] px-2.5 py-1.5">
                {avatarError}
              </div>
            )}
            <div className="font-serif text-[22px] font-semibold text-ink mt-4">
              {doctor.name}
            </div>
            {doctor.nameBn && (
              <div className="font-bn text-[13px] text-ink-3 mt-0.5">{doctor.nameBn}</div>
            )}
            <div className="text-[12.5px] text-accent-ink font-semibold mt-2">
              {doctor.specialty}
            </div>
            <div className="text-[11.5px] text-ink-3 mt-1 max-w-[240px]">
              {doctor.degrees.join(', ')}
            </div>
            <Badge tone="accent" variant="soft" className="mt-3" icon={<CheckCircle2 />}>
              BMDC {doctor.bmdcNo}
            </Badge>
          </div>
          <div className="border-t border-line p-5 grid gap-3 text-[13px]">
            <div className="flex items-center gap-3">
              <Phone className="h-3.5 w-3.5 text-ink-3" />
              <span className="font-mono">{doctor.phone}</span>
            </div>
            <div className="flex items-center gap-3">
              <Mail className="h-3.5 w-3.5 text-ink-3" />
              <span className="font-mono">{doctor.email}</span>
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader title="Personal information" />
          <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4 text-[13px]">
            <Field label="Full name" value={doctor.name} />
            <Field label="Name (Bangla)" value={doctor.nameBn ?? '—'} />
            <Field label="Specialty" value={doctor.specialty} />
            <Field label="BMDC No." value={doctor.bmdcNo} />
            <Field label="Phone" value={doctor.phone} mono />
            <Field label="Email" value={doctor.email} mono />
            <Field
              label="Degrees"
              value={doctor.degrees.join(', ')}
              className="md:col-span-2"
            />
          </div>
        </Card>
      </div>

      <SignatureCard doctor={doctor} />

      <Card>
        <CardHeader
          title="Chambers"
          icon={<MapPin />}
          actions={
            <Button variant="secondary" size="sm" leftIcon={<Plus />} onClick={openAdd}>
              Add chamber
            </Button>
          }
        />
        {doctor.chambers.length === 0 ? (
          <div className="p-8 text-center text-[13px] text-ink-3">
            No chambers yet. Add one so patients can find you on the public directory.
          </div>
        ) : (
          <div className="divide-y divide-line">
            {doctor.chambers.map((c) => (
              <div key={c.id} className="p-5 flex items-start gap-4">
                <div className="h-10 w-10 rounded-md bg-accent-softer text-accent-ink grid place-items-center shrink-0">
                  <MapPin className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-serif text-[15.5px] font-semibold text-ink">
                    {c.name}
                  </div>
                  <div className="text-[12.5px] text-ink-3 mt-0.5">{c.address}</div>
                  <div className="mt-2 flex flex-wrap gap-2 items-center text-[11.5px]">
                    {c.area && (
                      <span className="font-bold uppercase tracking-wider bg-accent-softer text-accent-ink rounded-xs px-1.5 py-0.5 text-[10.5px]">
                        {c.area}
                      </span>
                    )}
                    {c.time && <span className="text-ink-2 font-mono">{c.time}</span>}
                    {c.phone && <span className="text-ink-3 font-mono">· {c.phone}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="sm" onClick={() => openEdit(c)}>
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    leftIcon={<Trash2 />}
                    onClick={() => handleChamberDelete(c)}
                    className="text-danger hover:bg-danger-soft"
                  >
                    Remove
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <EditProfileModal
        open={editProfileOpen}
        onClose={() => setEditProfileOpen(false)}
        doctor={doctor}
        onSaved={onProfileSaved}
      />

      <ChamberEditorModal
        open={chamberOpen}
        onClose={() => setChamberOpen(false)}
        onSave={handleChamberSave}
        initial={chamberEditing}
      />
    </div>
  );
}

function Field({
  label,
  value,
  mono,
  className,
}: {
  label: string;
  value: string;
  mono?: boolean;
  className?: string;
}) {
  return (
    <div className={className}>
      <div className="text-[10.5px] font-bold uppercase tracking-[1.2px] text-ink-3">
        {label}
      </div>
      <div className={`mt-1 text-ink ${mono ? 'font-mono' : ''}`}>{value}</div>
    </div>
  );
}
