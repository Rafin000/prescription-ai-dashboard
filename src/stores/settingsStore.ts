import { create } from 'zustand';
import { DEFAULT_SETTINGS, type DoctorSettings } from '../services/settingsService';

type Resolved = Required<
  Omit<DoctorSettings, 'notifications' | 'printing' | 'theme'>
> & {
  notifications: Required<NonNullable<DoctorSettings['notifications']>>;
  printing: Required<NonNullable<DoctorSettings['printing']>>;
  theme: Required<NonNullable<DoctorSettings['theme']>>;
};

interface SettingsState {
  settings: Resolved;
  setSettings: (s: DoctorSettings | undefined) => void;
}

function merge(s?: DoctorSettings): Resolved {
  return {
    ...DEFAULT_SETTINGS,
    ...(s ?? {}),
    notifications: { ...DEFAULT_SETTINGS.notifications, ...(s?.notifications ?? {}) },
    printing: { ...DEFAULT_SETTINGS.printing, ...(s?.printing ?? {}) },
    theme: { ...DEFAULT_SETTINGS.theme, ...(s?.theme ?? {}) },
  };
}

/** Live, app-wide doctor settings. Backed by the same object react-query
 *  caches under ['doctor-settings']; this store is what UI code reads. */
export const useSettingsStore = create<SettingsState>((set) => ({
  settings: merge(),
  setSettings: (s) => set({ settings: merge(s) }),
}));

export const useResolvedSettings = () => useSettingsStore((s) => s.settings);
