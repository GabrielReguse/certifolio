import { useEffect, useMemo, useState } from 'react';
import { EmptyState } from '../components/EmptyState';
import { Icon } from '../components/Icon';
import { CourseCategoryIcon } from '../components/CourseCategoryIcon';
import { PageSkeleton } from '../components/Loading';
import { Modal } from '../components/Modal';
import { RatingStars } from '../components/RatingStars';
import { api } from '../lib/api';
import { formatDate, formatMinutes } from '../lib/format';
import { useRouter } from '../hooks/useRouter';
import type { Course, Institution } from '../types';

export function InstitutionsPage({ refreshKey, onEdit }: { refreshKey: number; onEdit: (course: Course) => void }) {
  const { navigate } = useRouter();
  const [items, setItems] = useState<Institution[] | null>(null);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<Institution | null>(null);
  const [courses, setCourses] = useState<Course[] | null>(null);
  const [folderError, setFolderError] = useState('');
  const [query, setQuery] = useState('');

  useEffect(() => {
    setError('');
    void api<{ institutions: Institution[] }>('/api/institutions')
      .then((data) => setItems(data.institutions))
      .catch((err) => setError(err instanceof Error ? err.message : 'Erro ao carregar.'));
  }, [refreshKey]);

  const openFolder = async (institution: Institution) => {
    setSelected(institution);
    setCourses(null);
    setFolderError('');
    setQuery('');
    try {
      const params = new URLSearchParams({ institution: institution.id, limit: '60' });
      const data = await api<{ courses: Course[] }>(`/api/courses?${params}`);
      setCourses(data.courses);
    } catch (err) {
      setFolderError(err instanceof Error ? err.message : 'Não foi possível abrir esta pasta.');
    }
  };

  const filtered = useMemo(() => {
    if (!courses) return null;
    const normalized = query.trim().toLowerCase();
    if (!normalized) return courses;
    return courses.filter((course) => [course.title, course.category, course.platformName, ...course.skills].some((value) => value.toLowerCase().includes(normalized)));
  }, [courses, query]);

  const folderStats = useMemo(() => {
    if (!courses?.length) return { average: 0, skills: [] as Array<[string, number]> };
    const rated = courses.filter((course) => course.rating > 0);
    const average = rated.length ? rated.reduce((sum, course) => sum + course.rating, 0) / rated.length : 0;
    const skillCount = new Map<string, number>();
    courses.forEach((course) => course.skills.forEach((skill) => skillCount.set(skill, (skillCount.get(skill) || 0) + 1)));
    const skills = [...skillCount.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 6);
    return { average, skills };
  }, [courses]);

  if (!items && !error) return <PageSkeleton/>;
  if (error) return <EmptyState icon="info" title="Não foi possível carregar as instituições" text={error}/>;

  return <div className="page-stack institutions-page">
    <section className="section-intro institution-intro">
      <div><span className="eyebrow">Organização automática</span><h2>Uma pasta para cada instituição.</h2><p>Clique em uma pasta para consultar todos os cursos, horas e competências vinculadas à emissora.</p></div>
      {items?.length ? <span className="institution-count"><b>{items.length}</b>{items.length === 1 ? 'instituição organizada' : 'instituições organizadas'}</span> : null}
    </section>

    {items?.length ? <div className="folder-grid">{items.map((item, index) => <button className="folder-card" style={{ '--folder-index': index } as React.CSSProperties} key={item.id} onClick={() => void openFolder(item)}>
      <div className="folder-card__top">
        <div className="folder-card__icon"><Icon name="folder" size={25}/></div>
        <span className="folder-card__status">{item.status === 'official' ? 'Verificada' : 'Comunidade'}</span>
      </div>
      <div className="folder-card__content">
        <h3>{item.name}</h3>
        <p>{item.courseCount} {item.courseCount === 1 ? 'curso' : 'cursos'} · {formatMinutes(item.totalMinutes)}</p>
      </div>
      <footer className="folder-card__footer-new">
        <span>Atualizada {formatDate(item.lastActivity)}</span>
        <strong>Abrir pasta <Icon name="arrow" size={15}/></strong>
      </footer>
    </button>)}</div> : <EmptyState icon="folder" title="As pastas aparecerão sozinhas" text="Cadastre cursos e as instituições serão agrupadas aqui."/>}

    <Modal open={Boolean(selected)} title={selected?.name || 'Instituição'} subtitle={selected ? `${selected.courseCount} ${selected.courseCount === 1 ? 'curso' : 'cursos'} · ${formatMinutes(selected.totalMinutes)}` : undefined} onClose={() => setSelected(null)} wide>
      <div className="institution-modal">
        {folderError ? <EmptyState icon="info" title="Não foi possível abrir a pasta" text={folderError}/> : !courses ? <div className="folder-loading"><Icon name="folder" size={34}/><span>Abrindo pasta…</span></div> : <>
          <div className="institution-summary">
            <article><span>Cursos</span><strong>{courses.length}</strong></article>
            <article><span>Carga horária</span><strong>{formatMinutes(courses.reduce((sum, course) => sum + course.hoursMinutes, 0))}</strong></article>
            <article><span>Avaliação média</span><strong>{folderStats.average ? (folderStats.average / 2).toFixed(1) : '—'}</strong><small>{folderStats.average ? <RatingStars rating={folderStats.average}/> : 'Sem avaliações'}</small></article>
          </div>
          {folderStats.skills.length ? <div className="institution-skills"><span>Competências frequentes</span><div>{folderStats.skills.map(([skill, count]) => <b key={skill}>{skill}<small>{count}</small></b>)}</div></div> : null}
          <div className="institution-toolbar"><div className="search-field"><Icon name="search" size={17}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar dentro desta pasta…"/></div>{selected?.website ? <a className="button button--ghost" href={selected.website} target="_blank" rel="noreferrer"><Icon name="external" size={16}/>Site da instituição</a> : null}</div>
          <div className="institution-course-list">
            {filtered?.length ? filtered.map((course, index) => <button key={course.id} style={{ '--course-index': index } as React.CSSProperties} onClick={() => { setSelected(null); onEdit(course); }}>
              <span className="course-symbol" title={course.category}><CourseCategoryIcon category={course.category} size={20}/></span>
              <span className="institution-course-list__content"><strong>{course.title}</strong><small>{[course.platformName, course.category, formatMinutes(course.hoursMinutes)].filter(Boolean).join(' · ')}</small><span className="chip-row">{course.skills.slice(0, 3).map((skill) => <i key={skill}>{skill}</i>)}</span></span>
              <span className="institution-course-list__rating"><RatingStars rating={course.rating} compact/><Icon name="arrow" size={17}/></span>
            </button>) : <EmptyState icon="search" title="Nenhum curso encontrado" text="Tente outro termo dentro desta pasta."/>}
          </div>
          <footer className="institution-modal__footer"><button className="button button--ghost" onClick={() => setSelected(null)}>Fechar</button><button className="button button--primary" onClick={() => navigate(`/app/cursos?instituicao=${encodeURIComponent(selected?.id || '')}&nome=${encodeURIComponent(selected?.name || '')}`)}>Ver na tela de cursos <Icon name="arrow" size={16}/></button></footer>
        </>}
      </div>
    </Modal>
  </div>;
}
