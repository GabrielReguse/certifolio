import { useSession } from '../context/SessionContext';
import { useRouter } from '../hooks/useRouter';
import { Icon } from '../components/Icon';
import { Logo } from '../components/Logo';

export function LandingPage() {
  const { navigate } = useRouter();
  const { user } = useSession();
  return <div className="landing">
    <header className="landing-nav"><Logo/><nav><button onClick={() => navigate('/entrar')}>Entrar</button><button className="button button--primary" onClick={() => navigate(user ? '/app' : '/criar-conta')}>{user ? 'Abrir aplicativo' : 'Criar conta'}</button></nav></header>
    <main className="landing-hero"><div className="landing-hero__copy"><span className="eyebrow">Portfólio de aprendizagem</span><h1>Todo curso conta.<br/><em>Faça ele aparecer.</em></h1><p>Guarde certificados, organize horas e monte um perfil profissional sem depender de planilhas ou pastas perdidas.</p><div className="landing-actions"><button className="button button--primary button--large" onClick={() => navigate(user ? '/app' : '/criar-conta')}>Começar gratuitamente <Icon name="arrow"/></button><button className="button button--ghost button--large" onClick={() => navigate('/u/demo')}>Ver perfil público</button></div><div className="landing-proof"><span><Icon name="check"/>Privado por padrão</span><span><Icon name="check"/>Sem cartão</span><span><Icon name="check"/>Exportável</span></div></div>
    <div className="landing-preview"><div className="preview-window"><div className="preview-window__bar"><i/><i/><i/></div><div className="preview-sidebar"/><div className="preview-content"><div className="preview-title"/><div className="preview-stats"><i/><i/><i/></div><div className="preview-chart"/><div className="preview-cards"><i/><i/></div></div></div></div></main>
    <section className="landing-features"><article><Icon name="folder"/><h2>Organização automática</h2><p>Cursos da mesma instituição ficam juntos sem você criar pastas manualmente.</p></article><article><Icon name="lock"/><h2>Privacidade de verdade</h2><p>O comprovante permanece privado até você decidir o contrário.</p></article><article><Icon name="profile"/><h2>Perfil apresentável</h2><p>Compartilhe uma página limpa com recrutadores, escolas e clientes.</p></article></section><footer className="landing-footer"><Logo compact/><span>© 2026 Certifólio</span><nav><button onClick={() => navigate('/privacidade')}>Privacidade</button><button onClick={() => navigate('/termos')}>Termos</button></nav></footer>
  </div>;
}
