import { useEffect, type ReactNode } from 'react';
import { useSession } from '../context/SessionContext';
import { useRouter } from '../hooks/useRouter';
import { initials } from '../lib/format';
import { Icon } from './Icon';
import { Logo } from './Logo';

const navigation = [
  { href: '/app', label: 'Início', icon: 'home' },
  { href: '/app/cursos', label: 'Cursos', icon: 'courses' },
  { href: '/app/metas', label: 'Metas', icon: 'target' },
  { href: '/app/instituicoes', label: 'Instituições', icon: 'folder' },
  { href: '/app/perfil', label: 'Perfil público', icon: 'profile' },
  { href: '/app/configuracoes', label: 'Configurações', icon: 'settings' },
];

export function AppShell({ title, subtitle, onNewCourse, children }: { title: string; subtitle: string; onNewCourse: () => void; children: ReactNode }) {
  const { path, navigate } = useRouter();
  const { user, profile, signOut } = useSession();
  const isActive = (href: string) => href === '/app' ? path === href : path.startsWith(href);
  const currentSection = path === '/app/lixeira'
    ? { label: 'Lixeira', icon: 'trash' }
    : navigation.find((item) => isActive(item.href)) || navigation[0];

  useEffect(() => {
    document.title = `${title} — Certifólio`;
  }, [title]);

  return <div className="app-shell">
    <aside className="sidebar">
      <Logo />
      <nav className="sidebar__nav">
        {navigation.map((item) => <button key={item.href} className={isActive(item.href) ? 'active' : ''} onClick={() => navigate(item.href)}><Icon name={item.icon}/><span>{item.label}</span></button>)}
      </nav>
      <div className="sidebar__account">
        <button className="account-card" onClick={() => navigate('/app/configuracoes')}>
          <span className="avatar avatar--small">{profile?.avatarKey ? <img src="/api/files/profile/avatar" alt=""/> : initials(profile?.displayName || user?.name || 'C')}</span>
          <span><strong>{profile?.displayName || user?.name}</strong><small>@{profile?.username || 'carregando'}</small></span>
        </button>
        <button className="icon-button" onClick={() => void signOut()} title="Sair"><Icon name="logout" size={19}/></button>
      </div>
    </aside>

    <main className="app-main">
      <header className="topbar">
        <div className="topbar__identity">
          <span className="topbar__mark" aria-hidden="true"><Icon name={currentSection.icon} size={23}/></span>
          <div className="topbar__copy">
            <span className="topbar__kicker"><i/>Certifólio <b>/</b> {currentSection.label}</span>
            <h1>{title}</h1>
            <p>{subtitle}</p>
          </div>
        </div>
        <div className="topbar__actions">
          <span className="topbar__signature">Seu histórico, finalmente útil.</span>
          <button className="button button--primary" onClick={onNewCourse}><Icon name="plus" size={18}/><span>Adicionar curso</span></button>
        </div>
      </header>
      <div className="page-container">{children}</div>
    </main>

    <nav className="mobile-nav">
      {navigation.filter((item) => item.href !== '/app/configuracoes').map((item) => <button key={item.href} className={isActive(item.href) ? 'active' : ''} onClick={() => navigate(item.href)}><Icon name={item.icon}/><span>{item.label}</span></button>)}
    </nav>
  </div>;
}
