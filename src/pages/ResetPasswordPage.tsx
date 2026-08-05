import { useState, type FormEvent } from 'react';
import { AuthLayout } from '../components/AuthLayout';
import { Icon } from '../components/Icon';
import { useRouter } from '../hooks/useRouter';
import { authClient } from '../lib/auth-client';

export function ResetPasswordPage() {
  const { navigate, search } = useRouter();
  const token = search.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState(search.get('error') ? 'Este link é inválido ou expirou.' : '');

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    if (password.length < 8 || password !== confirm) { setError('Use ao menos 8 caracteres e confirme a mesma senha.'); return; }
    if (!token) { setError('O link de recuperação não contém um token válido.'); return; }
    setLoading(true);
    try {
      const result = await authClient.resetPassword({ newPassword: password, token });
      if (result.error) { setError(result.error.message || 'Não foi possível alterar a senha.'); return; }
      setDone(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Não foi possível alterar a senha.');
    } finally {
      setLoading(false);
    }
  };

  return <AuthLayout title={done ? 'Senha alterada' : 'Crie uma nova senha'} subtitle={done ? 'Sua conta já pode ser acessada com a nova senha.' : 'Escolha uma senha diferente da anterior.'}>
    {done ? <div className="auth-success"><div><Icon name="check" size={28}/></div><button className="button button--primary button--full" onClick={() => navigate('/entrar')}>Entrar na conta</button></div> : <form className="auth-form" onSubmit={submit}>{error && <div className="form-alert form-alert--error"><Icon name="info" size={18}/>{error}</div>}<label className="field"><span>Nova senha</span><input type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} required autoFocus /></label><label className="field"><span>Confirmar senha</span><input type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required /></label><button className="button button--primary button--full" disabled={loading}>{loading ? 'Alterando…' : 'Salvar nova senha'}</button></form>}
  </AuthLayout>;
}
