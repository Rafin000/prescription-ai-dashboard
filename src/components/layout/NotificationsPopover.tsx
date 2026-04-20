import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { IconButton } from '../ui/IconButton';
import { Button } from '../ui/Button';
import {
  notificationsService,
  type NotificationItem,
} from '../../services/notificationsService';

const DOT_TONE: Record<NotificationItem['severity'], string> = {
  info: 'bg-info',
  success: 'bg-success',
  warn: 'bg-warn',
  danger: 'bg-danger',
};

export function NotificationsPopover() {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationsService.list(),
    refetchInterval: 30_000,
  });

  const markRead = useMutation({
    mutationFn: (id: string) => notificationsService.markRead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const markAllRead = useMutation({
    mutationFn: () => notificationsService.markAllRead(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  useEffect(() => {
    if (!open) return;
    const onClickAway = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onClickAway);
    return () => document.removeEventListener('mousedown', onClickAway);
  }, [open]);

  const items = data?.items ?? [];
  const unread = data?.unreadCount ?? 0;

  const onItemClick = (n: NotificationItem) => {
    if (!n.read) markRead.mutate(n.id);
    if (n.href) {
      setOpen(false);
      navigate(n.href);
    }
  };

  return (
    <div className="relative" ref={rootRef}>
      <IconButton aria-label="Notifications" onClick={() => setOpen((v) => !v)}>
        <Bell />
      </IconButton>
      {unread > 0 && (
        <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-live ring-2 ring-surface" />
      )}
      {open && (
        <div className="absolute right-0 top-[calc(100%+8px)] w-[360px] max-h-[520px] overflow-hidden rounded-lg border border-line bg-surface shadow-lg z-50 flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-line">
            <div className="text-[13px] font-semibold text-ink">
              Notifications {unread > 0 && <span className="text-ink-3 font-normal">· {unread} unread</span>}
            </div>
            {unread > 0 && (
              <Button
                variant="ghost"
                size="sm"
                leftIcon={<CheckCheck />}
                onClick={() => markAllRead.mutate()}
              >
                Mark all
              </Button>
            )}
          </div>
          <div className="flex-1 overflow-y-auto">
            {items.length === 0 ? (
              <div className="px-4 py-10 text-center text-[12.5px] text-ink-3">
                <Bell className="h-5 w-5 mx-auto mb-2 text-ink-3/60" />
                You're all caught up.
              </div>
            ) : (
              <ul className="divide-y divide-line">
                {items.map((n) => (
                  <li
                    key={n.id}
                    className={`px-4 py-3 cursor-pointer hover:bg-bg-muted ${
                      !n.read ? 'bg-accent-softer/40' : ''
                    }`}
                    onClick={() => onItemClick(n)}
                  >
                    <div className="flex items-start gap-2">
                      <span
                        className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${DOT_TONE[n.severity]}`}
                      />
                      <div className="min-w-0">
                        <div className="text-[13px] font-semibold text-ink truncate">
                          {n.title}
                        </div>
                        {n.body && (
                          <div className="text-[12px] text-ink-2 mt-0.5 line-clamp-2">
                            {n.body}
                          </div>
                        )}
                        <div className="text-[10.5px] text-ink-3 mt-1 font-mono">
                          {fmtRelative(n.ts)}
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function fmtRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}
