import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { AuthLayout } from '../components/AuthLayout';
import { Icon } from '../components/Icon';
import { Turnstile } from '../components/Turnstile';
import { useRouter } from '../hooks/useRouter';
import { api } from '../lib/api';
import { authClient } from '../lib/auth-client';

export function SignupPage() {
  const { navigate } = useRouter();
  const [name, setName] = useState(''); const [email, setEmail] = useState(''); const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState(''); const [loading, setLoading] = useState(false); const [error, setError] = useState('');
  const [config, setConfig] = useState({ googleAuth: false, emailVerification: false, turnstile: false, turnstileSiteKey: '' });
  const [turnstileToken, setTurnstileToken] = useState('');
  useEffect(() => { void api<typeof config>('/api/config').then(setConfig).catch(() => undefined); }, []);
  const onToken = useCallback((token: string) => setTurnstileToken(token), []);
  const rules = { length: password.length >= 8, letter: /[A-Za-z]/.test(password), number: /\d/.test(password), match: password.length > 0 && password === confirm };

  const submit = async (event: FormEvent) => {
    event.preventDefault(); setError('');
    if (!Object.values(rules).every(Boolean)) { setError('A senha ainda não cumpre todos os requisitos.'); return; }
    if (config.turnstile && !turnstileToken) { setError('Conclua a verificação de segurança.'); return; }
    setLoading(true);
    try {
      const result = await authClient.signUp.email({ name, email, password, callbackURL: '/app' }, { headers: { 'x-turnstile-token': turnstileToken } });
      if (result.error) { setError(result.error.message || 'Não foi possível criar sua conta.'); return; }
      if (config.emailVerification && !result.data?.token) navigate(`/verificar-email?email=${encodeURIComponent(email)}`);
      else navigate('/app', { replace: true });
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Não foi possível criar sua conta agora.');
    } finally {
      setLoading(false);
    }
  };

  return <AuthLayout title="Crie seu Certifólio" subtitle="Leva menos de um minuto. A organização vem depois.">
    <form className="auth-form" onSubmit={submit}>
      {error && <div className="form-alert form-alert--error"><Icon name="info" size={18}/>{error}</div>}
      <label className="field"><span>Seu nome</span><input autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Como você quer aparecer" required autoFocus /></label>
      <label className="field"><span>E-mail</span><input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@email.com" required /></label>
      <div className="form-grid form-grid--auth"><label className="field"><span>Senha</span><input type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} required /></label><label className="field"><span>Confirmar</span><input type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required /></label></div>
      <div className="password-rules"><span className={rules.length ? 'ok' : ''}><Icon name="check" size={14}/>8 caracteres</span><span className={rules.letter ? 'ok' : ''}><Icon name="check" size={14}/>Uma letra</span><span className={rules.number ? 'ok' : ''}><Icon name="check" size={14}/>Um número</span><span className={rules.match ? 'ok' : ''}><Icon name="check" size={14}/>Senhas iguais</span></div>
      {config.turnstile && <Turnstile siteKey={config.turnstileSiteKey} onToken={onToken}/>} 
      <button className="button button--primary button--full" disabled={loading}>{loading ? 'Criando conta…' : 'Criar minha conta'}</button>
      {config.googleAuth && <><div className="auth-divider"><span>ou</span></div><button type="button" className="button button--social button--full" onClick={() => void authClient.signIn.social({ provider: 'google', callbackURL: '/app' })}><b>G</b>Continuar com Google</button></>}
      <p className="legal-copy">Ao criar uma conta, você concorda com os <button type="button" onClick={() => navigate('/termos')}>Termos</button> e a <button type="button" onClick={() => navigate('/privacidade')}>Política de Privacidade</button>.</p>
      <p className="auth-switch">Já tem conta? <button type="button" onClick={() => navigate('/entrar')}>Entrar</button></p>
    </form>
  </AuthLayout>;
}
