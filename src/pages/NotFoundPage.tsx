import { EmptyState } from '../components/EmptyState';
import { Logo } from '../components/Logo';
import { useRouter } from '../hooks/useRouter';

export function NotFoundPage() { const { navigate } = useRouter(); return <main className="public-error"><Logo/><EmptyState icon="info" title="Esta página não existe" text="Talvez o endereço tenha mudado ou nunca tenha existido." action={<button className="button button--primary" onClick={() => navigate('/')}>Voltar ao início</button>}/></main>; }
