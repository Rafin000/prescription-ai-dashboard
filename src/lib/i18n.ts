import { useResolvedSettings } from '../stores/settingsStore';

/**
 * Minimal in-app translations. Covers the highest-frequency UI strings
 * (sidebar nav, page headers, common buttons) so the language toggle has
 * a clear visible effect. Strings not in the dictionary fall back to the
 * English key — translate more as needed without breaking anything.
 */
const BN: Record<string, string> = {
  // sidebar
  Dashboard: 'ড্যাশবোর্ড',
  Patients: 'রোগী',
  Appointments: 'অ্যাপয়েন্টমেন্ট',
  Consultations: 'কনসালটেশন',
  Medicines: 'ওষুধ',
  Templates: 'টেমপ্লেট',
  'Lab inbox': 'ল্যাব ইনবক্স',
  Team: 'টিম',
  Profile: 'প্রোফাইল',
  'Doctor profile': 'ডাক্তারের প্রোফাইল',
  'Rx templates': 'প্রেসক্রিপশন টেমপ্লেট',
  'AI usage': 'এআই ব্যবহার',
  Settings: 'সেটিংস',
  Billing: 'বিলিং',
  Usage: 'ব্যবহার',

  // common buttons
  Save: 'সংরক্ষণ',
  Cancel: 'বাতিল',
  Delete: 'মুছুন',
  Edit: 'সম্পাদনা',
  Close: 'বন্ধ',
  Search: 'খুঁজুন',
  'Sign out': 'সাইন আউট',
  'Sign in': 'সাইন ইন',
  Add: 'যোগ করুন',
  New: 'নতুন',
};

export function t(key: string, lang: 'en' | 'bn' = 'en'): string {
  if (lang === 'bn') return BN[key] ?? key;
  return key;
}

export function useT() {
  const lang = useResolvedSettings().interfaceLanguage;
  return (key: string) => t(key, lang);
}
