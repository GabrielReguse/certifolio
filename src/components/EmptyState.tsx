import type { ReactNode } from 'react';
import { Icon } from './Icon';

export function EmptyState({ icon = 'courses', title, text, action }: { icon?: string; title: string; text: string; action?: ReactNode }) {
  return <div className="empty-state"><div className="empty-state__icon"><Icon name={icon} size={26}/></div><h3>{title}</h3><p>{text}</p>{action}</div>;
}
