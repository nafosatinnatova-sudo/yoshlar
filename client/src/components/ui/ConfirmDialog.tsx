import { useRef, type ReactNode } from 'react';
import { CircleHelp, TriangleAlert } from 'lucide-react';
import { cn } from '@/utils/cn';
import { Button } from './Button';
import { Modal } from './Modal';

export interface ConfirmDialogProps {
  open: boolean;
  title: ReactNode;
  description?: ReactNode;
  /** Default "Tasdiqlash". */
  confirmLabel?: string;
  /** Default "Bekor qilish". */
  cancelLabel?: string;
  /** 'danger' (default) = rose confirm button + warning icon; 'primary' = indigo. */
  tone?: 'danger' | 'primary';
  /** Shows a spinner on the confirm button and blocks closing. */
  loading?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
  /** Extra content between the description and the buttons. */
  children?: ReactNode;
}

/**
 * Accessible confirmation modal (role="alertdialog"). Focus starts on the cancel button
 * (safe default for destructive actions); Esc / backdrop cancel unless `loading`.
 *
 * @example
 * <ConfirmDialog open={open} title="Rejani o'chirish" description="Bu amalni ortga qaytarib bo'lmaydi."
 *   confirmLabel="O'chirish" loading={deleting} onConfirm={handleDelete} onCancel={() => setOpen(false)} />
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Tasdiqlash',
  cancelLabel = 'Bekor qilish',
  tone = 'danger',
  loading = false,
  onConfirm,
  onCancel,
  children,
}: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const Icon = tone === 'danger' ? TriangleAlert : CircleHelp;

  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      description={description}
      role="alertdialog"
      size="sm"
      dismissible={!loading}
      initialFocusRef={cancelRef}
      hideCloseButton
      icon={
        <span
          className={cn(
            'flex h-10 w-10 items-center justify-center rounded-full',
            tone === 'danger'
              ? 'bg-rose-100 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400'
              : 'bg-indigo-100 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-400',
          )}
        >
          <Icon className="h-5 w-5" />
        </span>
      }
      footer={
        <>
          <Button ref={cancelRef} variant="secondary" onClick={onCancel} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button variant={tone === 'danger' ? 'danger' : 'primary'} onClick={() => void onConfirm()} loading={loading}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      {children}
    </Modal>
  );
}
