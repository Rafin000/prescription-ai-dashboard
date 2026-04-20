import { useEffect, useState, type FormEvent } from 'react';
import {
  AlertTriangle,
  Heart,
  MapPin,
  Phone,
  Save,
  User,
  Users,
} from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { useUpdatePatient } from '../../queries/hooks';
import type { Patient, Sex } from '../../types';

interface Props {
  open: boolean;
  patient: Patient;
  onClose: () => void;
  onSaved?: (patient: Patient) => void;
}

/** Edit the fields that change over time — demographics, contact, allergies,
 *  and emergency contact. Conditions + surgical plan live on the Rx flow. */
export function EditPatientModal({ open, patient, onClose, onSaved }: Props) {
  const update = useUpdatePatient();

  const [name, setName] = useState('');
  const [nameBn, setNameBn] = useState('');
  const [phone, setPhone] = useState('');
  const [age, setAge] = useState('');
  const [sex, setSex] = useState<Sex>('male');
  const [address, setAddress] = useState('');
  const [bloodGroup, setBloodGroup] = useState('');
  const [allergiesText, setAllergiesText] = useState('');
  const [emName, setEmName] = useState('');
  const [emRelation, setEmRelation] = useState('');
  const [emPhone, setEmPhone] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setName(patient.name ?? '');
    setNameBn(patient.nameBn ?? '');
    setPhone(patient.phone ?? '');
    setAge(String(patient.age ?? ''));
    setSex(patient.sex ?? 'male');
    setAddress(patient.address ?? '');
    setBloodGroup(patient.bloodGroup ?? '');
    setAllergiesText((patient.allergies ?? []).join(', '));
    setEmName(patient.emergencyContact?.name ?? '');
    setEmRelation(patient.emergencyContact?.relation ?? '');
    setEmPhone(patient.emergencyContact?.phone ?? '');
    setError(null);
  }, [open, patient]);

  const submit = async (e?: FormEvent) => {
    e?.preventDefault();
    setError(null);
    if (!name.trim()) return setError("Please enter the patient's name.");
    if (!phone.trim()) return setError('Phone number is required.');
    const ageNum = Number(age);
    if (!ageNum || Number.isNaN(ageNum) || ageNum < 0 || ageNum > 130) {
      return setError('Please enter a valid age.');
    }
    const allergies = allergiesText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const emergencyContact =
      emName.trim() || emRelation.trim() || emPhone.trim()
        ? {
            name: emName.trim(),
            relation: emRelation.trim(),
            phone: emPhone.trim(),
          }
        : null;
    try {
      const updated = await update.mutateAsync({
        id: patient.id,
        name: name.trim(),
        nameBn: nameBn.trim(),
        age: ageNum,
        sex,
        phone: phone.trim(),
        address: address.trim(),
        bloodGroup: bloodGroup.trim(),
        allergies,
        emergencyContact,
      });
      onSaved?.(updated);
      onClose();
    } catch (err) {
      setError(
        (err as { message?: string })?.message ?? 'Could not save the changes.'
      );
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={`Edit ${patient.name}'s details`}
      description="Demographics, contact, allergies, and the emergency contact. Medical history is updated from consult visits."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={update.isPending}>
            Cancel
          </Button>
          <Button
            variant="primary"
            leftIcon={<Save />}
            loading={update.isPending}
            onClick={() => submit()}
          >
            Save changes
          </Button>
        </>
      }
    >
      <form onSubmit={submit} className="flex flex-col gap-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Full name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            leftIcon={<User />}
            required
            autoFocus
          />
          <Input
            label="Name in Bangla"
            value={nameBn}
            onChange={(e) => setNameBn(e.target.value)}
            placeholder="Optional"
            wrapperClassName="[&_input]:font-bn"
          />
          <Input
            label="Phone number"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            leftIcon={<Phone />}
            type="tel"
            required
          />
          <Input
            label="Age"
            value={age}
            onChange={(e) => setAge(e.target.value.replace(/[^\d]/g, ''))}
            type="text"
            inputMode="numeric"
            required
          />
          <Select
            label="Sex"
            value={sex}
            onChange={(e) => setSex(e.target.value as Sex)}
            options={[
              { value: 'male', label: 'Male' },
              { value: 'female', label: 'Female' },
              { value: 'other', label: 'Other' },
            ]}
          />
          <Input
            label="Blood group"
            value={bloodGroup}
            onChange={(e) => setBloodGroup(e.target.value.toUpperCase())}
            leftIcon={<Heart />}
            placeholder="e.g. B+"
            maxLength={4}
          />
          <Input
            label="Address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            leftIcon={<MapPin />}
            wrapperClassName="sm:col-span-2"
          />
          <Input
            label="Allergies (comma-separated)"
            value={allergiesText}
            onChange={(e) => setAllergiesText(e.target.value)}
            leftIcon={<AlertTriangle />}
            placeholder="e.g. Penicillin, NSAIDs"
            wrapperClassName="sm:col-span-2"
          />
        </div>

        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="h-6 w-6 rounded-md bg-accent-softer text-accent-ink grid place-items-center">
              <Users className="h-3 w-3" />
            </span>
            <div className="text-[11.5px] font-semibold text-ink-2">
              Emergency contact
            </div>
            <span className="text-[11px] text-ink-3">(optional)</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-[1.2fr_0.8fr_1fr] gap-3">
            <Input
              value={emName}
              onChange={(e) => setEmName(e.target.value)}
              placeholder="Name"
            />
            <Input
              value={emRelation}
              onChange={(e) => setEmRelation(e.target.value)}
              placeholder="Relation"
            />
            <Input
              value={emPhone}
              onChange={(e) => setEmPhone(e.target.value)}
              type="tel"
              placeholder="Phone"
            />
          </div>
        </div>

        {error && (
          <div className="rounded-md bg-danger-soft border border-danger/30 text-danger text-[12.5px] px-3 py-2">
            {error}
          </div>
        )}
        <button type="submit" className="hidden" aria-hidden />
      </form>
    </Modal>
  );
}
