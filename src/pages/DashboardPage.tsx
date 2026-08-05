import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { EmptyState } from '../components/EmptyState';
import { Icon } from '../components/Icon';
import { CourseCategoryIcon } from '../components/CourseCategoryIcon';
import { RatingStars } from '../components/RatingStars';
import { PageSkeleton } from '../components/Loading';
import { useSession } from '../context/SessionContext';
import { useRouter } from '../hooks/useRouter';
import { api } from '../lib/api';
import { formatMinutes } from '../lib/format';
import type { DashboardData, LearningGoal } from '../types';

function useAnimatedNumber(value: number, duration = 700) {
  const [display, setDisplay] = useState(0);
  const current = useRef(0);

  useEffect(() => {
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion || document.visibilityState === 'hidden') {
      current.current = value;
      setDisplay(value);
      return;
    }

    const from = current.current;
    const distance = value - from;
    if (distance === 0) return;

    const start = performance.now();
    let frame = 0;
    let previous = from;

    const animate = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      const next = Math.round(from + distance * eased);

      // Evita atualizações repetidas quando o valor arredondado não mudou.
      if (next !== previous) {
        previous = next;
        current.current = next;
        setDisplay(next);
      }

      if (progress < 1) frame = requestAnimationFrame(animate);
    };

    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [duration, value]);

  return display;
}

function AnimatedMetric({ value, duration = 700, format = String }: { value: number; duration?: number; format?: (value: number) => ReactNode }) {
  const animated = useAnimatedNumber(value, duration);
  return <>{format(animated)}</>;
}

function goalValue(value: number, goal: LearningGoal) {
  if (goal.metric === 'courses') return `${Math.max(0, Math.ceil(value))} ${Math.ceil(value) === 1 ? 'curso' : 'cursos'}`;
  const rounded = Math.ceil(value * 10) / 10;
  return `${Number.isInteger(rounded) ? rounded.toFixed(0) : rounded.toFixed(1)}h`;
}

function GoalRing({ goal }: { goal: LearningGoal }) {
  const animatedPercent = useAnimatedNumber(Math.round(goal.percent), 900);

  return <div
    className="goal-ring"
    role="img"
    aria-label={`${animatedPercent}% da meta ${goal.title} concluída`}
    style={{ '--progress': `${animatedPercent * 3.6}deg` } as CSSProperties}
  >
    {goal.percent < 100 ? <div className="goal-ring__missing" aria-hidden="true"/> : null}
    <div className="goal-ring__core">
      <strong>{animatedPercent}%</strong>
      <span title={goal.title}>{goal.title}</span>
      {goal.remainingValue > 0 ? <small>faltam {goalValue(goal.remainingValue, goal)}</small> : <small>meta concluída</small>}
    </div>
  </div>;
}

function DashboardCourseSummary({ courses, onOpenGoals }: { courses: number; onOpenGoals: () => void }) {
  return <button className="dashboard-hero__fallback" type="button" onClick={onOpenGoals}>
    <span><Icon name="courses" size={28}/></span>
    <strong>{courses}</strong>
    <small>{courses === 1 ? 'curso registrado' : 'cursos registrados'}</small>
    <i>Criar uma meta <Icon name="arrow" size={14}/></i>
  </button>;
}

export function DashboardPage({ onNewCourse, refreshKey }: { onNewCourse: () => void; refreshKey: number }) {
  const { profile } = useSession();
  const { navigate } = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setError('');

    void api<DashboardData>('/api/courses/dashboard')
      .then((result) => { if (active) setData(result); })
      .catch((err) => { if (active) setError(err instanceof Error ? err.message : 'Erro ao carregar.'); });

    return () => { active = false; };
  }, [refreshKey]);

  if (!data && !error) return <PageSkeleton/>;
  if (error) return <EmptyState icon="info" title="Não conseguimos carregar o início" text={error} action={<button className="button button--primary" onClick={() => window.location.reload()}>Tentar novamente</button>}/>;
  if (!data) return null;

  return <div className="page-stack dashboard-page">
    {data.stats.totalCourses === 0 ? <section className="welcome-empty"><div><span className="eyebrow">Seu histórico começa aqui</span><h2>O primeiro certificado é o mais importante.</h2><p>Cadastre um curso, envie o comprovante e veja o dashboard ganhar vida.</p><button className="button button--primary" onClick={onNewCourse}><Icon name="plus"/>Adicionar primeiro curso</button></div><div className="welcome-empty__steps"><span><b>1</b>Cadastre</span><i/><span><b>2</b>Comprove</span><i/><span><b>3</b>Compartilhe</span></div></section> : <section className="dashboard-hero">
      <div className="dashboard-hero__orb dashboard-hero__orb--one"/><div className="dashboard-hero__orb dashboard-hero__orb--two"/>
      <div>
        <span className="eyebrow eyebrow--light">Resumo de aprendizagem</span>
        <h2>Bom te ver, {profile?.displayName.split(' ')[0]}.</h2>
        <p>Você já reuniu {formatMinutes(data.stats.totalMinutes)} de aprendizado em {data.stats.totalCourses} cursos.</p>
        <button className="button button--light" onClick={() => navigate('/app/perfil')}>Ver perfil público <Icon name="arrow"/></button>
      </div>
      {data.pinnedGoal ? <GoalRing goal={data.pinnedGoal}/> : <DashboardCourseSummary courses={data.stats.totalCourses} onOpenGoals={() => navigate('/app/metas')}/>}
    </section>}

    <section className="stats-grid">
      <article style={{ '--stat-index': 0 } as CSSProperties}><span>Cursos</span><strong><AnimatedMetric value={data.stats.totalCourses}/></strong><small>{data.stats.inProgress} em andamento</small></article>
      <article style={{ '--stat-index': 1 } as CSSProperties}><span>Carga horária</span><strong><AnimatedMetric value={data.stats.totalMinutes} format={formatMinutes}/></strong><small>Somadas em todos os cursos</small></article>
      <article style={{ '--stat-index': 2 } as CSSProperties}><span>Instituições</span><strong><AnimatedMetric value={data.stats.institutions}/></strong><small>Pastas automáticas</small></article>
      <article className="rating-stat-card" style={{ '--stat-index': 3 } as CSSProperties}><span>Avaliação média</span><strong>{data.stats.averageRating ? (data.stats.averageRating / 2).toFixed(1) : '—'}</strong><small>{data.stats.averageRating ? <RatingStars rating={data.stats.averageRating}/> : 'Sem avaliações'}</small></article>
    </section>

    <div className="dashboard-grid">
      <section className="panel dashboard-recent-panel"><header className="panel__header"><div><h2>Cursos recentes</h2><p>Passe o mouse para abrir um resumo do curso.</p></div><button className="text-link" onClick={() => navigate('/app/cursos')}>Ver todos</button></header>{data.recent.length ? <div className="dashboard-course-list">{data.recent.map((course, index) => <button key={course.id} style={{ '--course-index': index } as CSSProperties} onClick={() => navigate(`/app/cursos?curso=${encodeURIComponent(course.id)}`)}>
        <span className="course-symbol" title={course.category}><CourseCategoryIcon category={course.category} size={20}/></span>
        <span className="dashboard-course-list__main"><strong>{course.title}</strong><small>{course.institutionName} · {formatMinutes(course.hoursMinutes)}</small><span className="dashboard-course-list__details"><i>{course.description || `Curso de ${course.category.toLowerCase()} registrado no Certifólio.`}</i><span>{course.skills.slice(0, 3).map((skill) => <b key={skill}>{skill}</b>)}</span></span></span>
        <span className="dashboard-course-list__side"><RatingStars rating={course.rating} compact/><i>Editar <Icon name="arrow" size={15}/></i></span>
      </button>)}</div> : <EmptyState title="Nenhum curso ainda" text="Cadastre seu primeiro aprendizado."/>}</section>

      <section className="panel"><header className="panel__header"><div><h2>Competências</h2><p>Mais frequentes nos seus cursos.</p></div></header>{data.topSkills.length ? <div className="skill-bars">{data.topSkills.map((skill, index) => <div key={skill.name} style={{ '--skill-index': index } as CSSProperties}><span>{skill.name}</span><i><b style={{ '--skill-width': `${skill.count / data.topSkills[0].count * 100}%` } as CSSProperties}/></i><strong>{skill.count}</strong></div>)}</div> : <EmptyState icon="star" title="Ainda sem competências" text="Adicione habilidades aos cursos para montar este mapa."/>}</section>
    </div>
  </div>;
}
