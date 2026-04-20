import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../lib/cn';
import { Button } from './Button';

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  description?: ReactNode;
  footer?: ReactNode;
  size?: ModalSize;
  children: ReactNode;
  closeOnBackdrop?: boolean;
}

const sizeMap: Record<ModalSize, string> = {
  sm: 'max-w-[420px]',
  md: 'max-w-[560px]',
  lg: 'max-w-[760px]',
  xl: 'max-w-[960px]',
};

export function Modal({
  open,
  onClose,
  title,
  description,
  footer,
  size = 'md',
  children,
  closeOnBackdrop = true,
}: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-ink/40 backdrop-blur-[2px] animate-fade-in"
      onClick={() => closeOnBackdrop && onClose()}
      role="dialog"
      aria-modal="true"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={cn(
          'w-full bg-surface border border-line rounded-xl shadow-lg flex flex-col max-h-[90vh] animate-slide-up',
          sizeMap[size]
        )}
      >
        {(title || description) && (
          <div className="px-6 pt-5 pb-4 border-b border-line flex items-start justify-between gap-4">
            <div className="min-w-0">
              {title && (
                <h3 className="font-serif text-[18px] font-semibold text-ink tracking-tight">
                  {title}
                </h3>
              )}
              {description && <p className="text-[13px] text-ink-3 mt-1">{description}</p>}
            </div>
            <Button size="icon" variant="ghost" onClick={onClose} aria-label="Close">
              <X />
            </Button>
          </div>
        )}
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer && (
          <div className="px-6 py-4 border-t border-line bg-surface-muted flex items-center justify-end gap-2">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
