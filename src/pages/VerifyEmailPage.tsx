import { useState } from 'react';
import { AuthLayout } from '../components/AuthLayout';
import { Icon } from '../components/Icon';
import { useRouter } from '../hooks/useRouter';
import { authClient } from '../lib/auth-client';

export function VerifyEmailPage() {
  const { navigate, search } = useRouter();
  const email = search.get('email') || '';
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const resend = async () => {
    if (!email) { setMessage('O endereço de e-mail não foi informado.'); return; }
    setLoading(true);
    setMessage('');
    try {
      const result = await authClient.sendVerificationEmail({ email, callbackURL: '/app' });
      setMessage(result.error ? (result.error.message || 'Não foi possível reenviar.') : 'Novo e-mail enviado.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Não foi possível reenviar.');
    } finally {
      setLoading(false);
    }
  };

  return <AuthLayout title="Confirme seu e-mail" subtitle="Essa etapa impede contas falsas e protege seus certificados."><div className="auth-success"><div><Icon name="courses" size={28}/></div><p>Enviamos um link para <strong>{email || 'seu endereço de e-mail'}</strong>.</p>{message && <div className="form-alert"><Icon name="info" size={18}/>{message}</div>}<button className="button button--primary button--full" onClick={() => void resend()} disabled={loading || !email}>{loading ? 'Reenviando…' : 'Reenviar e-mail'}</button><button className="text-link text-link--center" onClick={() => navigate('/entrar')}>Já confirmei, voltar ao login</button></div></AuthLayout>;
}
