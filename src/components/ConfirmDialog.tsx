import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from './Icon';

type DialogInput = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  hint?: string;
  type?: 'text' | 'password';
};

export function ConfirmDialog({
  open,
  title,
  description,
  itemLabel,
  confirmLabel,
  cancelLabel = 'Cancelar',
  icon = 'trash',
  tone = 'danger',
  busy = false,
  input,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  description: string;
  itemLabel?: string;
  confirmLabel: string;
  cancelLabel?: string;
  icon?: string;
  tone?: 'danger' | 'accent';
  busy?: boolean;
  input?: DialogInput;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const confirmRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const timer = window.setTimeout(() => (input ? inputRef.current : confirmRef.current)?.focus(), 30);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [busy, input, onClose, open]);

  if (!open) return null;

  return createPortal(
    <div className="confirm-dialog-backdrop" onMouseDown={(event) => event.target === event.currentTarget && !busy && onClose()}>
      <section className={`confirm-dialog confirm-dialog--${tone}`} role="alertdialog" aria-modal="true" aria-labelledby="confirm-dialog-title" aria-describedby="confirm-dialog-description">
        <div className="confirm-dialog__icon"><Icon name={icon} size={24}/></div>
        <div className="confirm-dialog__copy">
          <span className="eyebrow">Confirmação necessária</span>
          <h2 id="confirm-dialog-title">{title}</h2>
          <p id="confirm-dialog-description">{description}</p>
        </div>
        {itemLabel ? <div className="confirm-dialog__item"><Icon name="courses" size={18}/><span>{itemLabel}</span></div> : null}
        {input ? <label className="field confirm-dialog__field"><span>{input.label}</span><input ref={inputRef} type={input.type || 'text'} value={input.value} onChange={(event) => input.onChange(event.target.value)} placeholder={input.placeholder}/>{input.hint ? <small>{input.hint}</small> : null}</label> : null}
        <footer className="confirm-dialog__actions">
          <button type="button" className="button button--ghost" disabled={busy} onClick={onClose}>{cancelLabel}</button>
          <button ref={confirmRef} type="button" className={tone === 'danger' ? 'button button--danger' : 'button button--primary'} disabled={busy} onClick={onConfirm}>{busy ? 'Processando…' : confirmLabel}</button>
        </footer>
      </section>
    </div>,
    document.body,
  );
}
