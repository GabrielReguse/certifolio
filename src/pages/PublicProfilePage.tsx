import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { EmptyState } from '../components/EmptyState';
import { Icon } from '../components/Icon';
import { CourseCategoryIcon } from '../components/CourseCategoryIcon';
import { AppLoading } from '../components/Loading';
import { Logo } from '../components/Logo';
import { RatingStars } from '../components/RatingStars';
import { useRouter } from '../hooks/useRouter';
import { api } from '../lib/api';
import { buildAccentPalette, type ResolvedTheme } from '../lib/color';
import { formatMinutes, initials } from '../lib/format';
import type { Course, ProfileVisibility } from '../types';

type PublicData = {
  profile: {
    username: string;
    displayName: string;
    bio: string;
    roleTitle: string;
    location: string;
    website: string;
    visibility: ProfileVisibility;
    layout: string;
    theme: string;
    accentColor: string;
    bannerPositionX: number;
    bannerPositionY: number;
    bannerZoom: number;
    showRating: boolean;
    showTotalHours: boolean;
    showInstitutions: boolean;
    allowIndexing: boolean;
    avatarUrl: string | null;
    bannerUrl: string | null;
  };
  courses: Course[];
  stats: { totalCourses: number; totalMinutes: number; averageRating: number; institutions: number };
};

const demo: PublicData = {
  profile: { username: 'demo', displayName: 'Gabriel Reguse', bio: 'Estudante de Informática, designer e desenvolvedor frontend. Aprendendo um curso de cada vez.', roleTitle: 'Designer & Desenvolvedor Frontend', location: 'Santa Catarina, Brasil', website: '', visibility: 'public', layout: 'grid', theme: 'light', accentColor: '#315c46', bannerPositionX: 50, bannerPositionY: 50, bannerZoom: 100, showRating: true, showTotalHours: true, showInstitutions: true, allowIndexing: false, avatarUrl: null, bannerUrl: null },
  stats: { totalCourses: 3, totalMinutes: 5640, averageRating: 9.3, institutions: 3 },
  courses: [
    { id:'1',title:'Fundamentos de UX Design',slug:'ux',institutionId:'1',institutionName:'Google',institutionWebsite:'',platformName:'Coursera',description:'Pesquisa, prototipação e fundamentos da experiência do usuário.',category:'Design',status:'completed',hoursMinutes:1320,startDate:null,endDate:'2026-03-10',issuedAt:null,expiresAt:null,rating:10,credentialId:'',verificationUrl:'',visibility:'public',certificateVisibility:'private',isFeatured:true,notes:'',skills:['UX','Pesquisa','Figma'],fileCount:1,createdAt:'',updatedAt:'',deletedAt:null},
    { id:'2',title:'JavaScript Moderno',slug:'js',institutionId:'2',institutionName:'Fundação Bradesco',institutionWebsite:'',platformName:'Escola Virtual',description:'Lógica, DOM e consumo de APIs.',category:'Programação',status:'completed',hoursMinutes:2400,startDate:null,endDate:'2026-02-20',issuedAt:null,expiresAt:null,rating:8,credentialId:'',verificationUrl:'',visibility:'public',certificateVisibility:'private',isFeatured:false,notes:'',skills:['JavaScript','DOM','APIs'],fileCount:1,createdAt:'',updatedAt:'',deletedAt:null},
    { id:'3',title:'HTML e CSS na Prática',slug:'html-css',institutionId:'3',institutionName:'SENAI',institutionWebsite:'',platformName:'SENAI Play',description:'Construção de interfaces responsivas.',category:'Programação',status:'completed',hoursMinutes:1920,startDate:null,endDate:'2025-12-05',issuedAt:null,expiresAt:null,rating:10,credentialId:'',verificationUrl:'',visibility:'public',certificateVisibility:'private',isFeatured:false,notes:'',skills:['HTML','CSS','Responsividade'],fileCount:1,createdAt:'',updatedAt:'',deletedAt:null},
  ],
};

function resolvePublicTheme(theme: string): ResolvedTheme {
  if (theme === 'system') {
    if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: light)').matches) return 'light';
    return 'dark';
  }
  return theme === 'light' ? 'light' : 'dark';
}

async function copyText(value: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }
  const helper = document.createElement('textarea');
  helper.value = value;
  helper.setAttribute('readonly', '');
  helper.style.position = 'fixed';
  helper.style.opacity = '0';
  document.body.appendChild(helper);
  helper.select();
  const copied = document.execCommand('copy');
  helper.remove();
  if (!copied) throw new Error('COPY_FAILED');
}

export function PublicProfilePage({ username }: { username: string }) {
  const { navigate } = useRouter();
  const [data, setData] = useState<PublicData | null>(username === 'demo' ? demo : null);
  const [error, setError] = useState('');
  const [shareLabel, setShareLabel] = useState('Compartilhar');

  useEffect(() => {
    if (username === 'demo') return;
    void api<PublicData>(`/api/public/profiles/${encodeURIComponent(username)}`)
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : 'Perfil indisponível.'));
  }, [username]);

  useEffect(() => {
    if (!data) return;
    const previousTitle = document.title;
    const managed: Array<{ element: Element; previous: string | null; created: boolean; attribute: string }> = [];
    const setMeta = (attribute: 'name' | 'property', key: string, content: string) => {
      let element = document.head.querySelector(`meta[${attribute}="${key}"]`);
      const created = !element;
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute(attribute, key);
        document.head.appendChild(element);
      }
      managed.push({ element, previous: element.getAttribute('content'), created, attribute: 'content' });
      element.setAttribute('content', content);
    };
    const canonicalUrl = `${window.location.origin}/u/${data.profile.username}`;
    let canonical = document.head.querySelector('link[rel="canonical"]');
    const canonicalCreated = !canonical;
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    managed.push({ element: canonical, previous: canonical.getAttribute('href'), created: canonicalCreated, attribute: 'href' });
    canonical.setAttribute('href', canonicalUrl);

    const description = data.profile.bio || `Cursos, habilidades e trajetória de ${data.profile.displayName} no Certifólio.`;
    setMeta('name', 'robots', data.profile.allowIndexing ? 'index,follow' : 'noindex,nofollow');
    setMeta('name', 'description', description.slice(0, 160));
    setMeta('property', 'og:title', `${data.profile.displayName} — Certifólio`);
    setMeta('property', 'og:description', description.slice(0, 200));
    setMeta('property', 'og:type', 'profile');
    setMeta('property', 'og:url', canonicalUrl);
    document.title = `${data.profile.displayName} — Certifólio`;

    return () => {
      managed.forEach(({ element, previous, created, attribute }) => {
        if (created) element.remove();
        else if (previous === null) element.removeAttribute(attribute);
        else element.setAttribute(attribute, previous);
      });
      document.title = previousTitle;
    };
  }, [data]);

  const courses = useMemo(() => data?.courses || [], [data]);
  const skillStats = useMemo(() => {
    const counts = new Map<string, number>();
    courses.forEach((course) => course.skills.forEach((skill) => counts.set(skill, (counts.get(skill) || 0) + 1)));
    return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 12);
  }, [courses]);

  if (!data && !error) return <AppLoading label="Abrindo perfil…"/>;
  if (error || !data) {
    return <main className="public-error"><Logo/><EmptyState icon="profile" title="Perfil indisponível" text={error || 'Este perfil não existe ou está privado.'} action={<button className="button button--primary" onClick={() => navigate('/')}>Ir para o Certifólio</button>}/></main>;
  }

  const p = data.profile;
  const resolvedTheme = resolvePublicTheme(p.theme);
  const averageScore = data.stats.averageRating ? (data.stats.averageRating / 2).toFixed(1) : '—';
  const featuredSkills = skillStats.slice(0, 6).map(([skill]) => skill);
  const maxSkillCount = Math.max(1, ...skillStats.map(([, count]) => count));
  const profilePalette = buildAccentPalette(p.accentColor, resolvedTheme);
  const profileStyle = {
    '--profile-accent-raw': profilePalette.raw,
    '--profile-accent': profilePalette.accent,
    '--profile-accent-strong': profilePalette.strong,
    '--profile-accent-contrast': profilePalette.onAccent,
    '--profile-accent-contrast-rgb': profilePalette.contrastRgb,
    '--profile-accent-overlay': profilePalette.overlay,
    '--profile-accent-overlay-strong': profilePalette.overlayStrong,
  } as CSSProperties;
  const bannerImageStyle = {
    objectPosition: `${p.bannerPositionX ?? 50}% ${p.bannerPositionY ?? 50}%`,
    transform: `scale(${(p.bannerZoom ?? 100) / 100})`,
  } as CSSProperties;

  const shareProfile = async () => {
    try {
      await copyText(window.location.href);
      setShareLabel('Link copiado');
      window.setTimeout(() => setShareLabel('Compartilhar'), 1800);
    } catch {
      setShareLabel('Não foi possível copiar');
      window.setTimeout(() => setShareLabel('Compartilhar'), 2200);
    }
  };

  return <main className={`public-profile public-profile--${resolvedTheme}`} style={profileStyle}>
    <div className="public-shell">
      <header className="public-nav">
        <Logo/>
        <div className="public-nav__actions">
          <button className="button button--ghost public-share-button" onClick={() => void shareProfile()}><Icon name="external" size={15}/>{shareLabel}</button>
          <button className="button button--ghost" onClick={() => navigate('/criar-conta')}>Criar meu perfil</button>
        </div>
      </header>

      <section className="public-hero-card">
        <div className="public-cover">
          {p.bannerUrl ? <img className="public-cover__image" src={p.bannerUrl} alt="" style={bannerImageStyle}/> : null}
          <div className="public-cover__glow"/>
          <div className="public-cover__content">
            <div className="public-person">
              <div className="public-avatar">{p.avatarUrl ? <img src={p.avatarUrl} alt=""/> : initials(p.displayName)}</div>
              <div className="public-person__info">
                <span className="eyebrow">@{p.username}</span>
                <h1>{p.displayName}</h1>
                <strong>{p.roleTitle}</strong>
                <p>{p.bio || 'Este perfil ainda não tem uma biografia pública.'}</p>
                <div className="public-meta">
                  {p.location && <span>{p.location}</span>}
                  {p.website && <a href={p.website} target="_blank" rel="noreferrer">Visitar site <Icon name="external" size={14}/></a>}
                </div>
              </div>
            </div>

            <aside className="public-summary-card">
              <span className="eyebrow eyebrow--light">Resumo</span>
              <strong>{data.stats.totalCourses} {data.stats.totalCourses === 1 ? 'curso publicado' : 'cursos publicados'}</strong>
              <p>{p.showTotalHours ? `${formatMinutes(data.stats.totalMinutes)} de estudo registrado.` : 'Perfil público pronto para compartilhar.'}</p>
              <div className="public-summary-card__chips">
                {p.visibility === 'unlisted' ? <span>Somente por link</span> : null}
                {featuredSkills.length ? featuredSkills.map((skill) => <span key={skill}>{skill}</span>) : <span>Em construção</span>}
              </div>
            </aside>
          </div>
        </div>

        <section className="public-stats">
          <article>
            <small>Total publicado</small>
            <strong>{data.stats.totalCourses}</strong>
            <span>cursos</span>
          </article>
          {p.showTotalHours && <article>
            <small>Carga horária</small>
            <strong>{formatMinutes(data.stats.totalMinutes)}</strong>
            <span>de estudo</span>
          </article>}
          {p.showInstitutions && <article>
            <small>Instituições</small>
            <strong>{data.stats.institutions}</strong>
            <span>emissoras</span>
          </article>}
          {p.showRating && <article>
            <small>Avaliação média</small>
            <strong>{averageScore}</strong>
            <span>{data.stats.averageRating ? <RatingStars rating={data.stats.averageRating}/> : 'Sem avaliações'}</span>
          </article>}
        </section>
      </section>

      {skillStats.length ? <section className="public-skill-map" aria-labelledby="skill-map-title">
        <header className="public-section-heading">
          <div><span className="eyebrow">Mapa de competências</span><h2 id="skill-map-title">Habilidades recorrentes</h2><p>Competências associadas aos cursos publicados neste perfil.</p></div>
        </header>
        <div className="public-skill-map__grid">{skillStats.map(([skill, count]) => <article key={skill}><div><strong>{skill}</strong><span>{count} {count === 1 ? 'curso' : 'cursos'}</span></div><i aria-hidden="true"><b style={{ width: `${Math.max(14, (count / maxSkillCount) * 100)}%` }}/></i></article>)}</div>
      </section> : null}

      <section className="public-content">
        <header className="public-section-heading">
          <div>
            <span className="eyebrow">Histórico de aprendizado</span>
            <h2>Cursos e certificações</h2>
            <p>Formações que esta pessoa escolheu tornar públicas.</p>
          </div>
        </header>

        {courses.length ? <div className={`public-course-grid public-course-grid--${p.layout}`}>
          {courses.map((course) => <article key={course.id}>
            <div className="public-course-top">
              <div className="course-symbol" title={course.category}><CourseCategoryIcon category={course.category} size={20}/></div>
              <span className="eyebrow">{course.category}</span>
            </div>
            <h3>{course.title}</h3>
            <p>{course.institutionName}{course.platformName ? ` · ${course.platformName}` : ''}</p>
            {course.description ? <div className="public-course-description">{course.description}</div> : null}
            <div className="chip-row">
              <span>{formatMinutes(course.hoursMinutes)}</span>
              {course.skills.slice(0, 3).map((skill) => <span key={skill}>{skill}</span>)}
            </div>
            {p.showRating && <RatingStars rating={course.rating} className="public-course-rating"/>}
            <div className="public-course-actions">
              {course.certificateVisibility === 'public' && course.fileCount > 0 && <a href={`/api/public/certificates/${course.id}`} target="_blank" rel="noreferrer">Abrir arquivo publicado <Icon name="eye" size={14}/></a>}
            </div>
          </article>)}
        </div> : <EmptyState title="Nenhum curso público" text="Este usuário ainda não publicou certificações."/>}
      </section>

      <footer className="public-footer"><Logo/><span>Perfil criado com Certifólio.</span></footer>
    </div>
  </main>;
}
