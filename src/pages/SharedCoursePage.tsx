import { useEffect, useState, type CSSProperties } from 'react';
import { EmptyState } from '../components/EmptyState';
import { Icon } from '../components/Icon';
import { AppLoading } from '../components/Loading';
import { Logo } from '../components/Logo';
import { RatingStars } from '../components/RatingStars';
import { useRouter } from '../hooks/useRouter';
import { api } from '../lib/api';
import { formatDate, formatMinutes, initials } from '../lib/format';

type SharedCourse = {
  id: string;
  title: string;
  institutionName: string;
  platformName: string;
  description: string;
  category: string;
  status: string;
  hoursMinutes: number;
  startDate: string | null;
  endDate: string | null;
  issuedAt: string | null;
  rating: number;
  credentialId: string;
  verificationUrl: string;
  certificateVisibility: string;
  fileCount: number;
  skills: string[];
  visibility: 'public' | 'unlisted';
};

type SharedCourseData = {
  course: SharedCourse;
  owner: {
    displayName: string;
    roleTitle: string;
    username: string | null;
    profilePublic: boolean;
    theme: string;
    accentColor: string;
    avatarUrl: string | null;
    allowIndexing: boolean;
  };
};

export function SharedCoursePage({ courseId }: { courseId: string }) {
  const { navigate } = useRouter();
  const [data, setData] = useState<SharedCourseData | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    void api<SharedCourseData>(`/api/public/courses/${encodeURIComponent(courseId)}`)
      .then(setData)
      .catch((reason) => setError(reason instanceof Error ? reason.message : 'Curso indisponível.'));
  }, [courseId]);

  useEffect(() => {
    if (!data) return;
    const robots = document.querySelector('meta[name="robots"]') || document.head.appendChild(Object.assign(document.createElement('meta'), { name: 'robots' }));
    const previousRobots = robots.getAttribute('content');
    const previousTitle = document.title;
    const canIndex = data.course.visibility === 'public' && data.owner.allowIndexing;
    robots.setAttribute('content', canIndex ? 'index,follow' : 'noindex,nofollow');
    document.title = `${data.course.title} — Certifólio`;
    return () => {
      if (previousRobots) robots.setAttribute('content', previousRobots);
      else robots.remove();
      document.title = previousTitle;
    };
  }, [data]);

  if (!data && !error) return <AppLoading label="Abrindo curso compartilhado…"/>;
  if (!data) return <main className="public-error"><Logo/><EmptyState icon="courses" title="Curso indisponível" text={error || 'O link não existe ou o curso voltou a ser privado.'} action={<button className="button button--primary" onClick={() => navigate('/')}>Ir para o Certifólio</button>}/></main>;

  const { course, owner } = data;
  return <main className={`shared-course-page public-profile--${owner.theme}`} style={{ '--profile-accent': owner.accentColor } as CSSProperties}>
    <header className="public-nav"><Logo/><button className="button button--ghost" onClick={() => navigate('/criar-conta')}>Criar meu Certifólio</button></header>
    <section className="shared-course-shell">
      <article className="shared-course-card">
        <div className="shared-course-owner">
          <div className="public-avatar">{owner.avatarUrl ? <img src={owner.avatarUrl} alt=""/> : initials(owner.displayName)}</div>
          <div><span>{course.visibility === 'unlisted' ? 'Compartilhado por link' : 'Curso público de'}</span><strong>{owner.displayName}</strong>{owner.roleTitle && <small>{owner.roleTitle}</small>}</div>
          {owner.profilePublic && owner.username && <button className="text-link" onClick={() => navigate(`/u/${owner.username}`)}>Ver perfil completo</button>}
        </div>
        <div className="shared-course-main">
          <span className="eyebrow">{course.category}</span>
          <h1>{course.title}</h1>
          <p className="shared-course-institution">{course.institutionName}{course.platformName ? ` · ${course.platformName}` : ''}</p>
          {course.description && <p className="shared-course-description">{course.description}</p>}
          <div className="shared-course-stats">
            <span><strong>{formatMinutes(course.hoursMinutes)}</strong><small>Carga horária</small></span>
            <span><strong>{course.endDate ? formatDate(course.endDate) : 'Em andamento'}</strong><small>Conclusão</small></span>
            <span><strong><RatingStars rating={course.rating}/></strong><small>Avaliação pessoal</small></span>
          </div>
          {course.skills.length > 0 && <div className="chip-row shared-course-skills">{course.skills.map((skill) => <span key={skill}>{skill}</span>)}</div>}
          {(course.credentialId || course.issuedAt) && <div className="shared-course-details">{course.credentialId && <p><span>ID da credencial</span><strong>{course.credentialId}</strong></p>}{course.issuedAt && <p><span>Emitido em</span><strong>{formatDate(course.issuedAt)}</strong></p>}</div>}
          <div className="public-course-actions shared-course-actions">
            {course.verificationUrl && <a href={course.verificationUrl} target="_blank" rel="noreferrer">Verificar credencial <Icon name="external" size={15}/></a>}
            {course.certificateVisibility === 'public' && course.fileCount > 0 && <a href={`/api/public/certificates/${course.id}`} target="_blank" rel="noreferrer">Abrir comprovante <Icon name="eye" size={15}/></a>}
          </div>
        </div>
      </article>
      <p className="shared-course-note"><Icon name="lock" size={15}/>Este link mostra somente as informações que o proprietário decidiu compartilhar.</p>
    </section>
    <footer className="public-footer"><Logo/><span>Curso organizado com Certifólio.</span></footer>
  </main>;
}
