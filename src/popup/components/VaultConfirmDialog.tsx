import { useEffect, type ReactNode } from 'react';

type Props = {
  open: boolean;
  title: string;
  description: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
};

/**
 * In-popup confirm dialog — matches vault light/dark themes (replaces window.confirm).
 */
export default function VaultConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
}: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      className="vault-confirm-overlay"
      onClick={onCancel}
      onKeyDown={(e) => e.key === 'Escape' && onCancel()}
      role="presentation"
    >
      <div
        className="vault-confirm-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="vault-confirm-title"
        aria-describedby="vault-confirm-desc"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="vault-confirm-kicker">Inkrypt</p>
        <h2 id="vault-confirm-title" className="vault-confirm-title">
          {title}
        </h2>
        <div id="vault-confirm-desc" className="vault-confirm-body">
          {description}
        </div>
        <div className="vault-confirm-actions">
          <button type="button" className="vault-confirm-btn vault-confirm-btn--primary" onClick={onConfirm}>
            {confirmLabel}
          </button>
          <button type="button" className="vault-confirm-btn vault-confirm-btn--secondary" onClick={onCancel}>
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
