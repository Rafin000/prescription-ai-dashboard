import { apiGet, apiPost } from '../lib/http';

export interface NotificationItem {
  id: string;
  kind: string;
  channel: 'in-app' | 'sms' | 'email' | 'web-push' | 'mobile-push';
  status: string;
  recipient: string;
  title: string;
  body: string;
  href?: string;
  severity: 'info' | 'success' | 'warn' | 'danger';
  read: boolean;
  ts: string;
}

export interface NotificationsList {
  items: NotificationItem[];
  unreadCount: number;
}

export const notificationsService = {
  list: (unread?: boolean) =>
    apiGet<NotificationsList>('/notifications', {
      params: unread ? { unread: 'true' } : undefined,
    }),
  markRead: (id: string) =>
    apiPost<void, Record<string, never>>(`/notifications/${id}/read`, {}),
  markAllRead: () =>
    apiPost<void, Record<string, never>>('/notifications/read-all', {}),
};
