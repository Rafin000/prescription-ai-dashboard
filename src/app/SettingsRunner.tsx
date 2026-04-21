import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { settingsService } from '../services/settingsService';
import { useSettingsStore } from '../stores/settingsStore';
import { useAuthStore } from '../stores/authStore';

/**
 * Mounted once at the app shell. Pulls the doctor's settings on login,
 * pushes them into the global settings store, and applies the
 * theme/density/lang side effects to the html root.
 */
export function SettingsRunner() {
  const isAuthed = useAuthStore((s) => !!s.user);
  const setSettings = useSettingsStore((s) => s.setSettings);
  const settings = useSettingsStore((s) => s.settings);

  const { data } = useQuery({
    queryKey: ['doctor-settings'],
    queryFn: () => settingsService.get(),
    enabled: isAuthed,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (data) setSettings(data.settings);
  }, [data, setSettings]);

  // html dataset / class side effects
  useEffect(() => {
    const root = document.documentElement;
    root.lang = settings.interfaceLanguage;
    root.dataset.density = settings.theme.density;
    if (settings.theme.appearance === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [
    settings.interfaceLanguage,
    settings.theme.density,
    settings.theme.appearance,
  ]);

  return null;
}
