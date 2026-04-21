import { apiGet, apiPatch, apiPost } from '../lib/http';

export interface DoctorSettings {
  interfaceLanguage?: 'en' | 'bn';
  rxLanguage?: 'en' | 'bn' | 'bilingual';
  dateFormat?: 'dd MMM yyyy' | 'yyyy-MM-dd' | 'MM/dd/yyyy';
  timeFormat?: '12h' | '24h';
  notifications?: {
    appointmentConfirmations?: boolean;
    labUploaded?: boolean;
    patientReschedules?: boolean;
  };
  printing?: {
    paperSize?: 'A4' | 'A5';
    pharmacyTearOff?: boolean;
    letterhead?: string;
  };
  theme?: {
    appearance?: 'light' | 'dark';
    density?: 'compact' | 'comfortable';
  };
}

export const DEFAULT_SETTINGS: Required<
  Omit<DoctorSettings, 'notifications' | 'printing' | 'theme'>
> & {
  notifications: Required<NonNullable<DoctorSettings['notifications']>>;
  printing: Required<NonNullable<DoctorSettings['printing']>>;
  theme: Required<NonNullable<DoctorSettings['theme']>>;
} = {
  interfaceLanguage: 'en',
  rxLanguage: 'bilingual',
  dateFormat: 'dd MMM yyyy',
  timeFormat: '12h',
  notifications: {
    appointmentConfirmations: true,
    labUploaded: true,
    patientReschedules: true,
  },
  printing: {
    paperSize: 'A4',
    pharmacyTearOff: true,
    letterhead: 'Clinical & calm (default)',
  },
  theme: {
    appearance: 'light',
    density: 'comfortable',
  },
};

export const settingsService = {
  get: () => apiGet<{ settings: DoctorSettings }>('/doctor/settings'),
  update: (patch: DoctorSettings) =>
    apiPatch<{ settings: DoctorSettings }, DoctorSettings>(
      '/doctor/settings',
      patch,
    ),
  changePassword: (currentPassword: string, newPassword: string) =>
    apiPost<void, { currentPassword: string; newPassword: string }>(
      '/auth/change-password',
      { currentPassword, newPassword },
    ),
};
