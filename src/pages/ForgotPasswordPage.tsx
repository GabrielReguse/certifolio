import { useEffect, useState, type FormEvent } from 'react';
import { AuthLayout } from '../components/AuthLayout';
import { Icon } from '../components/Icon';
import { useRouter } from '../hooks/useRouter';
import { api } from '../lib/api';
import { authClient } from '../lib/auth-client';

export function ForgotPasswordPage() {
  const { navigate } = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [emailAvailable, setEmailAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    void api<{ emailDelivery: boolean }>('/api/config')
      .then((data) => setEmailAvailable(data.emailDelivery))
      .catch(() => setEmailAvailable(false));
  }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!emailAvailable) return;
    setLoading(true);
    setError('');
    try {
      const result = await authClient.requestPasswordReset({ email, redirectTo: `${window.location.origin}/redefinir-senha` });
      if (result.error) {
        setError(result.error.message || 'Não foi possível enviar a recuperação.');
        return;
      }
      setSent(true);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Não foi possível enviar a recuperação.');
    } finally {
      setLoading(false);
    }
  };

  if (emailAvailable === false) {
    return <AuthLayout title="Recuperação indisponível" subtitle="O envio de e-mails ainda não foi configurado neste ambiente.">
      <div className="auth-success"><div><Icon name="info" size={28}/></div><p>Peça ao responsável pelo site para configurar o Resend ou use o login com Google, caso sua conta tenha sido criada assim.</p><button className="button button--primary button--full" onClick={() => navigate('/entrar')}>Voltar ao login</button></div>
    </AuthLayout>;
  }

  return <AuthLayout title={sent ? 'Confira seu e-mail' : 'Recupere sua senha'} subtitle={sent ? 'Enviamos as instruções caso exista uma conta com esse endereço.' : 'Informe o e-mail usado no cadastro.'}>
    {sent ? <div className="auth-success"><div><Icon name="check" size={28}/></div><p>O link de recuperação expira por segurança. Confira também a pasta de spam.</p><button className="button button--primary button--full" onClick={() => navigate('/entrar')}>Voltar ao login</button></div> : <form className="auth-form" onSubmit={submit}>{error && <div className="form-alert form-alert--error"><Icon name="info" size={18}/>{error}</div>}<label className="field"><span>E-mail</span><input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@email.com" required autoFocus /></label><button className="button button--primary button--full" disabled={loading || emailAvailable === null}>{emailAvailable === null ? 'Verificando…' : loading ? 'Enviando…' : 'Enviar link de recuperação'}</button><button type="button" className="text-link text-link--center" onClick={() => navigate('/entrar')}>Voltar ao login</button></form>}
  </AuthLayout>;
}
