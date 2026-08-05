import { useEffect, useState, type FormEvent, type CSSProperties } from 'react';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Icon } from '../components/Icon';
import { useSession } from '../context/SessionContext';
import { api, uploadFile } from '../lib/api';
import { buildAccentPalette } from '../lib/color';
import { formatMinutes, initials } from '../lib/format';
import type { DashboardData, Profile } from '../types';

const accentOptions = ['#315c46', '#2563eb', '#7c3aed', '#c0265e', '#d9480f', '#0f8585'];

export function ProfileEditorPage({ notify }: { notify: (message: string, type?: 'success' | 'error') => void }) {
  const { profile, user, refresh } = useSession();
  const [form, setForm] = useState<Profile | null>(profile);
  const [stats, setStats] = useState<DashboardData['stats'] | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<'avatar' | 'banner' | null>(null);
  const [avatarVersion, setAvatarVersion] = useState(0);
  const [bannerVersion, setBannerVersion] = useState(0);
  const [localAvatar, setLocalAvatar] = useState('');
  const [localBanner, setLocalBanner] = useState('');
  const [pendingRemove, setPendingRemove] = useState<'avatar' | 'banner' | null>(null);

  useEffect(() => setForm(profile), [profile]);
  useEffect(() => { void api<DashboardData>('/api/courses/dashboard').then((data) => setStats(data.stats)).catch(() => undefined); }, []);
  useEffect(() => () => {
    if (localAvatar) URL.revokeObjectURL(localAvatar);
    if (localBanner) URL.revokeObjectURL(localBanner);
  }, [localAvatar, localBanner]);

  if (!form) return null;
  const update = <K extends keyof Profile>(key: K, value: Profile[K]) => setForm((current) => current ? ({ ...current, [key]: value }) : current);

  const save = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      await api('/api/me/profile', { method: 'PATCH', body: form });
      await refresh();
      notify('Perfil atualizado.');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Não foi possível salvar.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const upload = async (kind: 'avatar' | 'banner', file?: File) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { notify('A imagem pode ter no máximo 5 MB.', 'error'); return; }
    const preview = URL.createObjectURL(file);
    if (kind === 'avatar') { if (localAvatar) URL.revokeObjectURL(localAvatar); setLocalAvatar(preview); }
    else { if (localBanner) URL.revokeObjectURL(localBanner); setLocalBanner(preview); }
    setUploading(kind);
    try {
      await uploadFile(`/api/files/profile/${kind}`, file);
      kind === 'avatar' ? setAvatarVersion(Date.now()) : setBannerVersion(Date.now());
      await refresh();
      notify(kind === 'avatar' ? 'Foto de perfil atualizada.' : 'Banner atualizado.');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Não foi possível enviar a imagem.', 'error');
      if (kind === 'avatar') setLocalAvatar(''); else setLocalBanner('');
    } finally {
      setUploading(null);
    }
  };

  const removeImage = async () => {
    if (!pendingRemove) return;
    const kind = pendingRemove;
    setUploading(kind);
    try {
      await api(`/api/files/profile/${kind}`, { method: 'DELETE' });
      if (kind === 'avatar') { setLocalAvatar(''); setAvatarVersion(Date.now()); update('avatarKey', null); }
      else { setLocalBanner(''); setBannerVersion(Date.now()); update('bannerKey', null); }
      setPendingRemove(null);
      await refresh();
      notify('Imagem removida.');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Não foi possível remover a imagem.', 'error');
    } finally {
      setUploading(null);
    }
  };

  const publicUrl = `${window.location.origin}/u/${form.username}`;
  const avatarSrc = localAvatar || (form.avatarKey ? `/api/files/profile/avatar?v=${avatarVersion}` : '');
  const bannerSrc = localBanner || (form.bannerKey ? `/api/files/profile/banner?v=${bannerVersion}` : '');
  const statsView = {
    courses: stats?.totalCourses ?? 0,
    hours: formatMinutes(stats?.totalMinutes ?? 0),
    institutions: stats?.institutions ?? 0,
  };
  const previewTheme = form.publicTheme === 'system'
    ? (window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    : form.publicTheme;
  const profilePalette = buildAccentPalette(form.accentColor, previewTheme);
  const profilePreviewStyle = {
    '--profile-accent-raw': profilePalette.raw,
    '--profile-accent': profilePalette.accent,
    '--profile-accent-strong': profilePalette.strong,
    '--profile-accent-contrast': profilePalette.onAccent,
    '--profile-accent-contrast-rgb': profilePalette.contrastRgb,
    '--profile-accent-overlay': profilePalette.overlay,
    '--profile-accent-overlay-strong': profilePalette.overlayStrong,
  } as CSSProperties;

  return <form className="profile-editor" onSubmit={save}><div className="profile-editor__form">
    <section className="panel profile-media-panel"><header className="panel__header"><div><span className="eyebrow">Sua identidade visual</span><h2>Foto e banner</h2><p>Essas imagens aparecem no topo do seu perfil público. Use JPG, PNG ou WebP de até 5 MB.</p></div></header>
      <div className="profile-media-banner" style={bannerSrc ? { backgroundImage: `url(${bannerSrc})` } : undefined}>
        <div className="profile-media-banner__shade"/>
        <div className="profile-media-avatar">{avatarSrc ? <img src={avatarSrc} alt="Prévia da foto de perfil"/> : initials(form.displayName || user?.name || 'C')}</div>
        <div className="profile-media-actions">
          <label className="button button--light"><Icon name="image" size={17}/>{uploading === 'banner' ? 'Enviando…' : bannerSrc ? 'Trocar banner' : 'Adicionar banner'}<input type="file" accept="image/jpeg,image/png,image/webp" disabled={Boolean(uploading)} onChange={(event) => void upload('banner', event.target.files?.[0])}/></label>
          {bannerSrc ? <button type="button" className="button button--glass" disabled={Boolean(uploading)} onClick={() => setPendingRemove('banner')}><Icon name="trash" size={16}/>Remover</button> : null}
        </div>
      </div>
      <div className="profile-avatar-controls"><div><strong>Foto de perfil</strong><span>Recomendado: imagem quadrada, com pelo menos 400 × 400 px.</span></div><div><label className="button button--ghost"><Icon name="camera" size={17}/>{uploading === 'avatar' ? 'Enviando…' : avatarSrc ? 'Trocar foto' : 'Adicionar foto'}<input type="file" accept="image/jpeg,image/png,image/webp" disabled={Boolean(uploading)} onChange={(event) => void upload('avatar', event.target.files?.[0])}/></label>{avatarSrc ? <button type="button" className="button button--quiet-danger" disabled={Boolean(uploading)} onClick={() => setPendingRemove('avatar')}>Remover</button> : null}</div></div>
    </section>

    <section className="panel"><header className="panel__header"><div><h2>Identidade</h2><p>As informações principais do seu perfil.</p></div></header><div className="form-grid">
      <label className="field"><span>Nome de exibição</span><input value={form.displayName} onChange={(e) => update('displayName', e.target.value)}/></label>
      <label className="field"><span>Nome de usuário</span><div className="input-prefix"><b>@</b><input value={form.username} onChange={(e) => update('username', e.target.value.toLowerCase())}/></div></label>
      <label className="field"><span>Título profissional</span><input value={form.roleTitle} onChange={(e) => update('roleTitle', e.target.value)} placeholder="Designer e desenvolvedor frontend"/></label>
      <label className="field"><span>Localização</span><input value={form.location} onChange={(e) => update('location', e.target.value)} placeholder="Santa Catarina, Brasil"/></label>
      <label className="field field--full"><span className="field-label-row">Biografia <small>{form.bio.length}/600</small></span><textarea value={form.bio} maxLength={600} onChange={(e) => update('bio', e.target.value)} placeholder="Conte o que você estuda, cria e pretende alcançar."/></label>
      <label className="field field--full"><span>Site ou portfólio</span><input type="url" value={form.website} onChange={(e) => update('website', e.target.value)} placeholder="https://..."/></label>
    </div></section>

    <section className="panel appearance-panel"><header className="panel__header"><div><h2>Aparência pública</h2><p>Escolha como sua trajetória será apresentada para outras pessoas.</p></div></header>
      <div className="appearance-group"><span>Layout</span><div className="visual-choice-grid">{([
        ['grid', 'Grade', 'Cursos em cartões equilibrados.'],
        ['timeline', 'Linha do tempo', 'Destaque para a ordem da trajetória.'],
        ['resume', 'Currículo', 'Visual direto para recrutadores.'],
      ] as const).map(([value, label, description]) => <button type="button" key={value} className={form.profileLayout === value ? 'selected' : ''} onClick={() => update('profileLayout', value)}><Icon name={value === 'grid' ? 'courses' : value === 'timeline' ? 'more' : 'profile'} size={20}/><strong>{label}</strong><small>{description}</small><i><Icon name="check" size={13}/></i></button>)}</div></div>
      <div className="appearance-group"><span>Tema do perfil</span><div className="theme-choice-row">{([
        ['light', 'sun', 'Claro'], ['dark', 'moon', 'Escuro'], ['system', 'monitor', 'Sistema'],
      ] as const).map(([value, icon, label]) => <button type="button" key={value} className={form.publicTheme === value ? 'selected' : ''} onClick={() => update('publicTheme', value)}><Icon name={icon}/><span>{label}</span></button>)}</div></div>
      <div className="appearance-group"><span>Cor de destaque</span><div className="profile-color-picker">{accentOptions.map((color) => <button type="button" key={color} className={form.accentColor.toLowerCase() === color ? 'selected' : ''} style={{ background: color }} onClick={() => update('accentColor', color)} aria-label={`Usar a cor ${color}`}/>)}<label><input type="color" value={form.accentColor} onChange={(e) => update('accentColor', e.target.value)}/><Icon name="plus" size={16}/><span>Personalizada</span></label></div></div>
      <div className="appearance-group"><span>Visibilidade</span><div className="visibility-choice"><button type="button" className={form.profileVisibility === 'public' ? 'selected' : ''} onClick={() => update('profileVisibility', 'public')}><Icon name="globe"/><span><strong>Público</strong><small>Qualquer pessoa com o endereço pode acessar.</small></span></button><button type="button" className={form.profileVisibility === 'private' ? 'selected' : ''} onClick={() => update('profileVisibility', 'private')}><Icon name="lock"/><span><strong>Privado</strong><small>Seu perfil fica visível apenas para você.</small></span></button></div></div>
      <div className="settings-switches"><label><input type="checkbox" checked={form.showTotalHours} onChange={(e) => update('showTotalHours', e.target.checked)}/><span><strong>Mostrar horas totais</strong><small>Exibe a soma dos cursos públicos.</small></span></label><label><input type="checkbox" checked={form.showRating} onChange={(e) => update('showRating', e.target.checked)}/><span><strong>Mostrar avaliações</strong><small>As estrelas são sua avaliação pessoal.</small></span></label><label><input type="checkbox" checked={form.showInstitutions} onChange={(e) => update('showInstitutions', e.target.checked)}/><span><strong>Mostrar instituições</strong><small>Exibe o total de emissoras.</small></span></label><label><input type="checkbox" checked={form.allowIndexing} onChange={(e) => update('allowIndexing', e.target.checked)}/><span><strong>Permitir buscadores</strong><small>Somente faz sentido em perfil público.</small></span></label></div>
    </section>

    <footer className="sticky-save"><span>{form.profileVisibility === 'public' ? <>Seu perfil: <a href={publicUrl} target="_blank" rel="noreferrer">/u/{form.username}</a></> : 'Seu perfil está privado.'}</span><button className="button button--primary" disabled={saving}>{saving ? 'Salvando…' : 'Salvar perfil'}</button></footer>
  </div>

  <aside className="profile-preview-panel"><div className="preview-label"><span>Prévia ao vivo</span><small>As alterações de texto aparecem aqui antes de salvar.</small></div><div className="profile-mini" style={profilePreviewStyle}><div className="profile-mini__banner" style={bannerSrc ? { backgroundImage: `linear-gradient(120deg,color-mix(in srgb, var(--profile-accent-contrast) 48%, transparent),transparent),url(${bannerSrc})` } : undefined}/><div className="profile-mini__content"><div className="profile-mini__avatar">{avatarSrc ? <img src={avatarSrc} alt=""/> : initials(form.displayName || user?.name || 'C')}</div><h2>{form.displayName || 'Seu nome'}</h2><strong>{form.roleTitle || 'Seu título profissional'}</strong><p>{form.bio || 'Sua biografia aparecerá aqui.'}</p><div className="profile-mini__stats"><span><b>{statsView.courses}</b>cursos</span><span><b>{statsView.hours}</b>estudadas</span><span><b>{statsView.institutions}</b>instituições</span></div></div></div><a className="preview-open" href={publicUrl} target="_blank" rel="noreferrer">Abrir perfil em nova guia <Icon name="external" size={15}/></a></aside>
  <ConfirmDialog open={Boolean(pendingRemove)} title={pendingRemove === 'avatar' ? 'Remover foto de perfil' : 'Remover banner'} description={pendingRemove === 'avatar' ? 'A foto atual será retirada do perfil. Suas iniciais serão usadas até uma nova imagem ser adicionada.' : 'O banner atual será removido e o perfil voltará a usar o fundo padrão.'} confirmLabel="Remover imagem" busy={Boolean(uploading)} onClose={() => !uploading && setPendingRemove(null)} onConfirm={() => void removeImage()}/>
  </form>;
}
