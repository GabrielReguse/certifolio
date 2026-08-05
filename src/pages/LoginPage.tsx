import { useEffect, useState, type FormEvent } from 'react';
import { AuthLayout } from '../components/AuthLayout';
import { Icon } from '../components/Icon';
import { useRouter } from '../hooks/useRouter';
import { api } from '../lib/api';
import { authClient } from '../lib/auth-client';

export function LoginPage() {
  const { navigate, search } = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [config, setConfig] = useState({ googleAuth: false, emailDelivery: false });
  useEffect(() => { void api<typeof config>('/api/config').then(setConfig).catch(() => undefined); }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await authClient.signIn.email({ email, password, rememberMe: true });
      if (result.error) { setError(result.error.message || 'E-mail ou senha inválidos.'); return; }
      const requested = search.get('redirect');
      navigate(requested?.startsWith('/app') ? requested : '/app', { replace: true });
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Não foi possível entrar agora.');
    } finally {
      setLoading(false);
    }
  };

  return <AuthLayout title="Bem-vindo de volta" subtitle="Entre para continuar construindo seu histórico.">
    <form className="auth-form" onSubmit={submit}>
      {error && <div className="form-alert form-alert--error"><Icon name="info" size={18}/>{error}</div>}
      <label className="field"><span>E-mail</span><input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@email.com" required autoFocus /></label>
      <label className="field"><span>Senha</span><div className="password-input"><input type={show ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Sua senha" required/><button type="button" onClick={() => setShow((value) => !value)}><Icon name="eye" size={18}/></button></div></label>
      {config.emailDelivery && <button type="button" className="text-link text-link--right" onClick={() => navigate('/esqueci-senha')}>Esqueci minha senha</button>}
      <button className="button button--primary button--full" disabled={loading}>{loading ? 'Entrando…' : 'Entrar'}</button>
      {config.googleAuth && <><div className="auth-divider"><span>ou</span></div><button type="button" className="button button--social button--full" onClick={() => void authClient.signIn.social({ provider: 'google', callbackURL: '/app' })}><b>G</b>Continuar com Google</button></>}
      <p className="auth-switch">Ainda não tem conta? <button type="button" onClick={() => navigate('/criar-conta')}>Criar gratuitamente</button></p>
    </form>
  </AuthLayout>;
}
