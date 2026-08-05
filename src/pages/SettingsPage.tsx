import { useState, type FormEvent } from 'react';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Icon } from '../components/Icon';
import { useSession } from '../context/SessionContext';
import { useRouter } from '../hooks/useRouter';
import { authClient } from '../lib/auth-client';
import type { ThemeMode } from '../types';

const accents = ['#315c46', '#2563eb', '#7c3aed', '#c2410c', '#be185d', '#0f766e'];

export function SettingsPage({ mode, accent, setMode, setAccent, notify }: { mode: ThemeMode; accent: string; setMode: (mode: ThemeMode) => void; setAccent: (color: string) => void; notify: (message: string, type?: 'success' | 'error') => void }) {
  const { user, signOut } = useSession(); const { navigate } = useRouter();
  const [currentPassword, setCurrentPassword] = useState(''); const [newPassword, setNewPassword] = useState(''); const [loading, setLoading] = useState(false); const [deleting, setDeleting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false); const [deletePassword, setDeletePassword] = useState('');
  const deleteAccount = async () => {
    setDeleting(true);
    try {
      const result = await authClient.deleteUser(deletePassword ? { password: deletePassword } : {});
      if (result.error) { notify(result.error.message || 'Não foi possível excluir a conta.', 'error'); return; }
      setDeleteDialogOpen(false);
      window.location.assign('/');
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Não foi possível excluir a conta.', 'error');
    } finally {
      setDeleting(false);
    }
  };
  const changePassword = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    try {
      const result = await authClient.changePassword({ currentPassword, newPassword, revokeOtherSessions: true });
      if (result.error) notify(result.error.message || 'Não foi possível alterar a senha.', 'error');
      else { setCurrentPassword(''); setNewPassword(''); notify('Senha alterada e outras sessões encerradas.'); }
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Não foi possível alterar a senha.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return <div className="settings-layout"><section className="panel"><header className="panel__header"><div><h2>Aparência do aplicativo</h2><p>Essas escolhas ficam salvas neste navegador.</p></div></header><div className="theme-options">{([['light','sun','Claro'],['dark','moon','Escuro'],['system','monitor','Sistema']] as const).map(([value,icon,label]) => <button key={value} className={mode === value ? 'selected' : ''} onClick={() => setMode(value)}><Icon name={icon}/><strong>{label}</strong>{mode === value && <Icon name="check" size={16}/>}</button>)}</div><div className="accent-picker"><span>Cor de destaque</span><div>{accents.map((color) => <button key={color} className={accent.toLowerCase() === color ? 'selected' : ''} style={{ background: color }} onClick={() => setAccent(color)} aria-label={`Usar ${color}`}/>)}<label className="custom-color"><input type="color" value={accent} onChange={(e) => setAccent(e.target.value)}/><Icon name="plus" size={17}/></label></div></div></section>
    <section className="panel"><header className="panel__header"><div><h2>Conta e segurança</h2><p>{user?.email}</p></div></header><form className="form-grid" onSubmit={changePassword}><label className="field"><span>Senha atual</span><input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required/></label><label className="field"><span>Nova senha</span><input type="password" minLength={8} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required/></label><div className="field field--full"><button className="button button--primary" disabled={loading}>{loading ? 'Alterando…' : 'Alterar senha'}</button></div></form></section>
    <section className="panel"><header className="panel__header"><div><h2>Dados e manutenção</h2><p>Ferramentas para manter o histórico sob seu controle.</p></div></header><div className="settings-actions"><button onClick={() => navigate('/app/lixeira')}><Icon name="trash"/><span><strong>Abrir lixeira</strong><small>Restaure cursos excluídos.</small></span><Icon name="arrow"/></button><button onClick={() => { const link = document.createElement('a'); link.href = '/api/export'; link.click(); notify('Exportação iniciada.'); }}><Icon name="courses"/><span><strong>Exportar meus dados</strong><small>Baixa perfil, cursos e metadados em JSON.</small></span><Icon name="arrow"/></button><button onClick={() => void signOut()}><Icon name="logout"/><span><strong>Sair da conta</strong><small>Encerra a sessão neste dispositivo.</small></span><Icon name="arrow"/></button></div></section><section className="panel danger-zone"><header className="panel__header"><div><h2>Zona de risco</h2><p>A exclusão remove a conta, os cursos e os arquivos enviados.</p></div></header><button className="button button--danger" type="button" disabled={deleting} onClick={() => setDeleteDialogOpen(true)}>{deleting ? 'Excluindo…' : 'Excluir minha conta'}</button></section>
    <ConfirmDialog open={deleteDialogOpen} title="Excluir conta permanentemente" description="A conta, os cursos, os comprovantes e as configurações serão removidos. Esta ação não pode ser desfeita." itemLabel={user?.email} confirmLabel="Excluir minha conta" busy={deleting} input={{ label: 'Senha da conta', type: 'password', value: deletePassword, onChange: setDeletePassword, placeholder: 'Digite sua senha', hint: 'Contas criadas somente com Google podem deixar este campo vazio.' }} onClose={() => { if (!deleting) { setDeleteDialogOpen(false); setDeletePassword(''); } }} onConfirm={() => void deleteAccount()}/>
  </div>;
}
