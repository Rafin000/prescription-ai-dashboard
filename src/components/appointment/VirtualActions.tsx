import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Link2, Video } from 'lucide-react';
import { cn } from '../../lib/cn';
import type { Appointment } from '../../types';

interface VirtualActionsProps {
  appointment: Appointment;
  size?: 'sm' | 'md';
  variant?: 'full' | 'compact';
  className?: string;
}

/**
 * Virtual-appointment actions: join the call (doctor) + copy the patient
 * join link. Renders nothing for in-person appointments.
 */
export function VirtualActions({
  appointment,
  size = 'sm',
  variant = 'full',
  className,
}: VirtualActionsProps) {
  const [copied, setCopied] = useState(false);

  if (appointment.type !== 'tele' || !appointment.joinToken) return null;

  const joinUrl = `${window.location.origin}/join/${appointment.joinToken}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(joinUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard may be blocked — fall back to prompting the link
      window.prompt('Copy the join link and send it to your patient:', joinUrl);
    }
  };

  const sizeClasses = size === 'md' ? 'h-9 px-3 text-[13px]' : 'h-7 px-2.5 text-[11.5px]';
  const iconSize = size === 'md' ? 'h-3.5 w-3.5' : 'h-3 w-3';

  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          copy();
        }}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-md border font-semibold transition-colors',
          sizeClasses,
          copied
            ? 'bg-success-soft text-success border-success/30'
            : 'bg-surface text-ink-2 border-line hover:border-line-strong hover:bg-bg-muted'
        )}
        aria-label={copied ? 'Link copied' : 'Copy patient join link'}
        title={copied ? 'Link copied' : joinUrl}
      >
        {copied ? <Check className={iconSize} /> : <Link2 className={iconSize} />}
        {variant === 'full' && (copied ? 'Copied!' : 'Copy link')}
      </button>

      <Link
        to={`/call/${appointment.id}`}
        onClick={(e) => e.stopPropagation()}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-md font-semibold bg-accent text-white hover:bg-accent-hover transition-colors shadow-accent',
          sizeClasses
        )}
      >
        <Video className={iconSize} />
        {variant === 'full' ? 'Join call' : 'Join'}
      </Link>
    </div>
  );
}
