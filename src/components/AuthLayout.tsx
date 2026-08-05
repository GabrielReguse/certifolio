import type { ReactNode } from 'react';
import { Logo } from './Logo';

export function AuthLayout({ children, title, subtitle }: { children: ReactNode; title: string; subtitle: string }) {
  return <main className="auth-page">
    <section className="auth-visual">
      <Logo />
      <div className="auth-visual__copy"><span className="eyebrow eyebrow--light">Seu histórico, finalmente útil</span><h1>Conhecimento não deveria terminar esquecido na pasta Downloads.</h1><p>Organize certificados, acompanhe suas horas e apresente tudo em um perfil profissional.</p></div>
    </section>
    <section className="auth-panel"><div className="auth-panel__mobile-logo"><Logo /></div><div className="auth-card"><header><h2>{title}</h2><p>{subtitle}</p></header>{children}</div><p className="auth-footer">Seus certificados começam privados. Você escolhe o que publicar.</p></section>
  </main>;
}
