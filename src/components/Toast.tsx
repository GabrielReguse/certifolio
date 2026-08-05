import { useEffect } from 'react';
import { Icon } from './Icon';

export type ToastData = { id: number; message: string; type?: 'success' | 'error' | 'info' };

const toastMeta = {
  success: { title: 'Tudo certo', icon: 'check' },
  error: { title: 'Não foi possível concluir', icon: 'info' },
  info: { title: 'Aviso', icon: 'info' },
} as const;

export function Toast({ toast, onClose }: { toast: ToastData; onClose: () => void }) {
  const type = toast.type || 'success';
  const meta = toastMeta[type];

  useEffect(() => {
    const timer = window.setTimeout(onClose, 4200);
    return () => window.clearTimeout(timer);
  }, [toast.id, onClose]);

  return <div className={`toast toast--${type}`} role={type === 'error' ? 'alert' : 'status'} aria-live={type === 'error' ? 'assertive' : 'polite'}>
    <span className="toast__icon" aria-hidden="true"><Icon name={meta.icon} size={18}/></span>
    <span className="toast__copy"><strong>{meta.title}</strong><span>{toast.message}</span></span>
    <button className="toast__close" onClick={onClose} aria-label="Fechar notificação"><Icon name="close" size={15}/></button>
    <span className="toast__progress" aria-hidden="true"/>
  </div>;
}
