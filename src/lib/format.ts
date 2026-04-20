import { format, formatDistanceToNow, parseISO } from 'date-fns';

export const fmtDate = (iso: string, pattern = 'dd MMM yyyy'): string =>
  format(parseISO(iso), pattern);

export const fmtTime = (iso: string): string => format(parseISO(iso), 'h:mm a');

export const fmtDateTime = (iso: string): string =>
  format(parseISO(iso), 'dd MMM yyyy, h:mm a');

export const fmtRelative = (iso: string): string =>
  formatDistanceToNow(parseISO(iso), { addSuffix: true });

export const initials = (name: string): string => {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};
