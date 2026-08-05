import { useEffect, useState, type FormEvent } from 'react';
import { Icon } from '../components/Icon';
import { Logo } from '../components/Logo';
import { useSession } from '../context/SessionContext';
import { useRouter } from '../hooks/useRouter';
import { api } from '../lib/api';
import type { Profile } from '../types';

export function OnboardingPage() {
  const { profile, refresh } = useSession();
  const { navigate } = useRouter();
  const [step, setStep] = useState(1);
  const [displayName, setDisplayName] = useState(profile?.displayName || '');
  const [username, setUsername] = useState(profile?.username || '');
  const [goal, setGoal] = useState('portfolio');
  const [isPublic, setIsPublic] = useState(false);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!profile) return;
    setDisplayName(profile.displayName); setUsername(profile.username);
  }, [profile]);

  useEffect(() => {
    if (username.length < 3 || username === profile?.username) { setAvailable(username === profile?.username); return; }
    const timer = window.setTimeout(() => { void api<{ available: boolean }>(`/api/me/username-available?username=${encodeURIComponent(username)}`).then((data) => setAvailable(data.available)).catch(() => setAvailable(null)); }, 400);
    return () => window.clearTimeout(timer);
  }, [username, profile?.username]);

  const finish = async (event: FormEvent) => {
    event.preventDefault(); if (!profile) return; setSaving(true); setError('');
    try {
      await api<{ profile: Profile }>('/api/me/profile', { method: 'PATCH', body: { ...profile, displayName, username, profileVisibility: isPublic ? 'public' : 'private', onboardingCompleted: true } });
      localStorage.setItem('certifolio-goal', goal);
      await refresh(); navigate('/app', { replace: true });
    } catch (err) { setError(err instanceof Error ? err.message : 'Não foi possível concluir.'); }
    finally { setSaving(false); }
  };

  return <main className="onboarding"><header><Logo/><span>Etapa {step} de 3</span></header><form onSubmit={finish} className="onboarding-card">
    <div className="onboarding-progress"><i style={{ width: `${step / 3 * 100}%` }}/></div>
    {error && <div className="form-alert form-alert--error"><Icon name="info" size={18}/>{error}</div>}
    {step === 1 && <section><span className="eyebrow">Sua identidade</span><h1>Como seu perfil deve aparecer?</h1><p>Você poderá mudar tudo depois.</p><label className="field"><span>Nome de exibição</span><input value={displayName} onChange={(e) => setDisplayName(e.target.value)} autoFocus /></label><label className="field"><span>Endereço público</span><div className="username-input"><b>{window.location.host}/u/</b><input value={username} onChange={(e) => setUsername(e.target.value.toLowerCase())}/></div><small className={available ? 'validation-ok' : available === false ? 'validation-error' : ''}>{available ? 'Disponível' : available === false ? 'Já está em uso' : 'Use letras, números, ponto, hífen ou _'}</small></label></section>}
    {step === 2 && <section><span className="eyebrow">Seu objetivo</span><h1>O que você quer organizar primeiro?</h1><p>Isso apenas adapta os atalhos do início.</p><div className="choice-grid">{[['portfolio','Criar meu portfólio','Mostrar cursos para oportunidades.'],['hours','Controlar horas','Acompanhar carga horária complementar.'],['archive','Guardar certificados','Ter tudo seguro e pesquisável.'],['progress','Ver minha evolução','Entender competências e consistência.']].map(([value,title,text]) => <button type="button" key={value} className={goal === value ? 'selected' : ''} onClick={() => setGoal(value)}><Icon name={goal === value ? 'check' : 'courses'}/><strong>{title}</strong><span>{text}</span></button>)}</div></section>}
    {step === 3 && <section><span className="eyebrow">Privacidade</span><h1>Você decide quando aparecer.</h1><p>Certificados e cursos começam privados, mesmo com perfil público.</p><div className="privacy-choice"><button type="button" className={!isPublic ? 'selected' : ''} onClick={() => setIsPublic(false)}><Icon name="lock"/><span><strong>Começar privado</strong><small>Só você consegue abrir seu perfil.</small></span></button><button type="button" className={isPublic ? 'selected' : ''} onClick={() => setIsPublic(true)}><Icon name="globe"/><span><strong>Publicar o perfil vazio</strong><small>Os cursos continuam privados até você publicar cada um.</small></span></button></div></section>}
    <footer><button type="button" className="button button--ghost" onClick={() => step === 1 ? undefined : setStep(step - 1)} disabled={step === 1}>Voltar</button>{step < 3 ? <button type="button" className="button button--primary" disabled={(step === 1 && (!displayName || !available))} onClick={() => setStep(step + 1)}>Continuar</button> : <button className="button button--primary" disabled={saving}>{saving ? 'Preparando…' : 'Abrir meu Certifólio'}</button>}</footer>
  </form></main>;
}
