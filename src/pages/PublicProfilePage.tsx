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
import type { Course } from '../types';

type PublicData = {
  profile: { username: string; displayName: string; bio: string; roleTitle: string; location: string; website: string; layout: string; theme: string; accentColor: string; showRating: boolean; showTotalHours: boolean; showInstitutions: boolean; allowIndexing: boolean; avatarUrl: string | null; bannerUrl: string | null };
  courses: Course[];
  stats: { totalCourses: number; totalMinutes: number; averageRating: number; institutions: number };
};

const demo: PublicData = {
  profile: { username: 'demo', displayName: 'Gabriel Reguse', bio: 'Estudante de Informática, designer e desenvolvedor frontend. Aprendendo um curso de cada vez.', roleTitle: 'Designer & Desenvolvedor Frontend', location: 'Santa Catarina, Brasil', website: '', layout: 'grid', theme: 'light', accentColor: '#315c46', showRating: true, showTotalHours: true, showInstitutions: true, allowIndexing: false, avatarUrl: null, bannerUrl: null },
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

export function PublicProfilePage({ username }: { username: string }) {
  const { navigate } = useRouter();
  const [data, setData] = useState<PublicData | null>(username === 'demo' ? demo : null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (username === 'demo') return;
    void api<PublicData>(`/api/public/profiles/${encodeURIComponent(username)}`)
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : 'Perfil indisponível.'));
  }, [username]);

  useEffect(() => {
    if (!data) return;
    const robots = document.querySelector('meta[name="robots"]') || document.head.appendChild(Object.assign(document.createElement('meta'), { name: 'robots' }));
    const previousRobots = robots.getAttribute('content');
    const previousTitle = document.title;
    robots.setAttribute('content', data.profile.allowIndexing ? 'index,follow' : 'noindex,nofollow');
    document.title = `${data.profile.displayName} — Certifólio`;
    return () => {
      if (previousRobots) robots.setAttribute('content', previousRobots);
      else robots.remove();
      document.title = previousTitle;
    };
  }, [data]);

  const courses = useMemo(() => data?.courses || [], [data]);

  if (!data && !error) return <AppLoading label="Abrindo perfil…"/>;
  if (error || !data) {
    return <main className="public-error"><Logo/><EmptyState icon="profile" title="Perfil indisponível" text={error || 'Este perfil não existe ou está privado.'} action={<button className="button button--primary" onClick={() => navigate('/')}>Ir para o Certifólio</button>}/></main>;
  }

  const p = data.profile;
  const resolvedTheme = resolvePublicTheme(p.theme);
  const averageScore = data.stats.averageRating ? (data.stats.averageRating / 2).toFixed(1) : '—';
  const featuredSkills = Array.from(new Set(courses.flatMap((course) => course.skills))).slice(0, 6);
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

  return <main className={`public-profile public-profile--${resolvedTheme}`} style={profileStyle}>
    <div className="public-shell">
      <header className="public-nav">
        <Logo/>
        <button className="button button--ghost" onClick={() => navigate('/criar-conta')}>Criar meu perfil</button>
      </header>

      <section className="public-hero-card">
        <div className="public-cover" style={p.bannerUrl ? { backgroundImage: `linear-gradient(120deg,color-mix(in srgb, var(--profile-accent-contrast) 58%, transparent),color-mix(in srgb, var(--profile-accent-contrast) 18%, transparent)),url(${p.bannerUrl})` } : undefined}>
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

      <section className="public-content">
        <header className="public-section-heading">
          <div>
            <span className="eyebrow">Histórico comprovado</span>
            <h2>Cursos e certificações</h2>
            <p>Os aprendizados públicos desta trajetória.</p>
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
              {course.verificationUrl && <a href={course.verificationUrl} target="_blank" rel="noreferrer">Verificar credencial <Icon name="external" size={14}/></a>}
              {course.certificateVisibility === 'public' && course.fileCount > 0 && <a href={`/api/public/certificates/${course.id}`} target="_blank" rel="noreferrer">Abrir comprovante <Icon name="eye" size={14}/></a>}
            </div>
          </article>)}
        </div> : <EmptyState title="Nenhum curso público" text="Este usuário ainda não publicou certificações."/>}
      </section>

      <footer className="public-footer"><Logo/><span>Perfil criado com Certifólio.</span></footer>
    </div>
  </main>;
}
