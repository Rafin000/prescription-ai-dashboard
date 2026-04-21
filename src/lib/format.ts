import { format, formatDistanceToNow, parseISO } from 'date-fns';
import { useSettingsStore } from '../stores/settingsStore';

/* ─── settings-aware helpers ─────────────────────────────────────
 * These read directly from the zustand store at call time, so any
 * setting change flips the formatting without component restructure. */

function currentDateFmt(): string {
  return useSettingsStore.getState().settings.dateFormat;
}
function currentTimeFmt(): string {
  return useSettingsStore.getState().settings.timeFormat === '24h'
    ? 'HH:mm'
    : 'h:mm a';
}

export const fmtDate = (iso: string, pattern?: string): string =>
  format(parseISO(iso), pattern ?? currentDateFmt());

export const fmtTime = (iso: string): string =>
  format(parseISO(iso), currentTimeFmt());

export const fmtDateTime = (iso: string): string =>
  format(parseISO(iso), `${currentDateFmt()}, ${currentTimeFmt()}`);

export const fmtRelative = (iso: string): string =>
  formatDistanceToNow(parseISO(iso), { addSuffix: true });

export const initials = (name: string): string => {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};
