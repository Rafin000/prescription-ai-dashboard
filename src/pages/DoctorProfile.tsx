import { Camera, CheckCircle2, Edit3, Mail, MapPin, Phone } from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { Card, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Avatar } from '../components/ui/Avatar';
import { SignatureCard } from '../components/doctor/SignatureCard';
import { useCurrentDoctor } from '../queries/hooks';

export function DoctorProfile() {
  const { data: doctor } = useCurrentDoctor();

  if (!doctor) return <div className="text-[13px] text-ink-3">Loading profile…</div>;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Doctor profile"
        description="This information appears on your prescription letterhead and your patient-facing booking page."
        actions={
          <Button variant="primary" leftIcon={<Edit3 />}>
            Edit profile
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.4fr] gap-5">
        <Card>
          <div className="p-6 flex flex-col items-center text-center">
            <div className="relative">
              <Avatar name={doctor.name} size="xl" ring />
              <button
                type="button"
                className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full bg-accent text-white grid place-items-center shadow-sm"
                aria-label="Change photo"
              >
                <Camera className="h-4 w-4" />
              </button>
            </div>
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
          <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Full name" defaultValue={doctor.name} />
            <Input label="Name (Bangla)" defaultValue={doctor.nameBn} />
            <Input label="Specialty" defaultValue={doctor.specialty} />
            <Input label="BMDC No." defaultValue={doctor.bmdcNo} />
            <Input label="Phone" defaultValue={doctor.phone} leftIcon={<Phone />} />
            <Input label="Email" defaultValue={doctor.email} leftIcon={<Mail />} />
            <Input
              label="Degrees"
              defaultValue={doctor.degrees.join(', ')}
              wrapperClassName="md:col-span-2"
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
            <Button variant="secondary" size="sm">
              Add chamber
            </Button>
          }
        />
        <div className="divide-y divide-line">
          {doctor.chambers.map((c) => (
            <div key={c.id} className="p-5 flex items-start gap-4">
              <div className="h-10 w-10 rounded-md bg-accent-softer text-accent-ink grid place-items-center shrink-0">
                <MapPin className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-serif text-[15.5px] font-semibold text-ink">{c.name}</div>
                <div className="text-[12.5px] text-ink-3 mt-0.5">{c.address}</div>
                <div className="mt-2 flex flex-wrap gap-2 items-center text-[11.5px]">
                  {c.days.map((d) => (
                    <span
                      key={d}
                      className="font-bold uppercase tracking-wider bg-accent-softer text-accent-ink rounded-xs px-1.5 py-0.5 text-[10.5px]"
                    >
                      {d}
                    </span>
                  ))}
                  <span className="text-ink-2 font-mono">{c.time}</span>
                  {c.phone && <span className="text-ink-3 font-mono">· {c.phone}</span>}
                </div>
              </div>
              <Button variant="ghost" size="sm">
                Edit
              </Button>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
