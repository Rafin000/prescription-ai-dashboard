import { useEffect, useState, type FormEvent } from 'react';
import { Heart, MapPin, Phone, Stethoscope, User } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { useCreatePatient } from '../../queries/hooks';
import type { Patient, Sex } from '../../types';

interface NewPatientModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (patient: Patient) => void;
  /** Pre-fill values if the user typed a name/phone in the picker search. */
  prefill?: {
    name?: string;
    phone?: string;
  };
  /** Primary-button label. Defaults to the consult-flow wording since the
   *  modal is historically opened from the "Start consult" picker. */
  submitLabel?: string;
  /** Subtitle under the modal title — lets callers reframe the copy when
   *  the modal is used outside the consult flow (e.g., booking or a plain
   *  patient record). */
  description?: string;
}

export function NewPatientModal({
  open,
  onClose,
  onCreated,
  prefill,
  submitLabel,
  description,
}: NewPatientModalProps) {
  const { mutate: create, isPending } = useCreatePatient();

  const [name, setName] = useState('');
  const [nameBn, setNameBn] = useState('');
  const [phone, setPhone] = useState('');
  const [age, setAge] = useState('');
  const [sex, setSex] = useState<Sex>('male');
  const [address, setAddress] = useState('');
  const [bloodGroup, setBloodGroup] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Reset / prefill whenever the modal opens.
  useEffect(() => {
    if (!open) return;
    setName(prefill?.name ?? '');
    setNameBn('');
    setPhone(prefill?.phone ?? '');
    setAge('');
    setSex('male');
    setAddress('');
    setBloodGroup('');
    setError(null);
  }, [open, prefill?.name, prefill?.phone]);

  const submit = (e?: FormEvent) => {
    e?.preventDefault();
    setError(null);
    if (!name.trim()) return setError('Please enter the patient\u2019s name.');
    if (!phone.trim()) return setError('Phone number is required.');
    const ageNum = Number(age);
    if (!ageNum || Number.isNaN(ageNum) || ageNum < 0 || ageNum > 130) {
      return setError('Please enter a valid age.');
    }
    create(
      {
        name: name.trim(),
        nameBn: nameBn.trim() || undefined,
        phone: phone.trim(),
        age: ageNum,
        sex,
        address: address.trim() || undefined,
        bloodGroup: bloodGroup.trim() || undefined,
      },
      {
        onSuccess: (p) => onCreated(p),
        onError: (err) =>
          setError((err as { message?: string })?.message ?? 'Could not create the patient.'),
      }
    );
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      title="Register a new patient"
      description={
        description ??
        'Just the essentials for now — you can add medical history and vitals from the patient profile later.'
      }
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button
            variant="primary"
            leftIcon={<Stethoscope />}
            loading={isPending}
            onClick={() => submit()}
          >
            {submitLabel ?? 'Save & start consult'}
          </Button>
        </>
      }
    >
      <form onSubmit={submit} className="flex flex-col gap-4">
        <Input
          label="Full name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          leftIcon={<User />}
          placeholder="Rahima Begum"
          inputSize="lg"
          autoFocus
          required
        />
        <Input
          label="Name in Bangla (optional)"
          value={nameBn}
          onChange={(e) => setNameBn(e.target.value)}
          placeholder="রহিমা বেগম"
          wrapperClassName="[&_input]:font-bn"
        />
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Phone number"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            leftIcon={<Phone />}
            type="tel"
            placeholder="+880 1XXX-XXX XXX"
            required
          />
          <Input
            label="Age"
            value={age}
            onChange={(e) => setAge(e.target.value.replace(/[^\d]/g, ''))}
            type="text"
            inputMode="numeric"
            placeholder="e.g. 34"
            required
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
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
            label="Blood group (optional)"
            value={bloodGroup}
            onChange={(e) => setBloodGroup(e.target.value.toUpperCase())}
            leftIcon={<Heart />}
            placeholder="e.g. B+"
            maxLength={4}
          />
        </div>
        <Input
          label="Address (optional)"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          leftIcon={<MapPin />}
          placeholder="House 14, Road 7/A, Dhanmondi, Dhaka"
        />
        {error && (
          <div className="rounded-md bg-danger-soft border border-danger/30 text-danger text-[12.5px] px-3 py-2">
            {error}
          </div>
        )}
        {/* Keep the submit hooked up to Enter in any field */}
        <button type="submit" className="hidden" aria-hidden />
      </form>
    </Modal>
  );
}
