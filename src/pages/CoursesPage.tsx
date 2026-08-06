import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CourseCard } from '../components/CourseCard';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { EmptyState } from '../components/EmptyState';
import { Icon } from '../components/Icon';
import { CourseCategoryIcon } from '../components/CourseCategoryIcon';
import { PageSkeleton } from '../components/Loading';
import { useRouter } from '../hooks/useRouter';
import { api } from '../lib/api';
import { formatDate, formatMinutes } from '../lib/format';
import type { Course } from '../types';

type CourseSort = 'recent' | 'oldest' | 'longest' | 'shortest' | 'most-skills' | 'least-skills';

const categories = ['Programação', 'Design', 'Negócios', 'Idiomas', 'Educação', 'Dados', 'Segurança', 'Outros'];

const sortOptions: Array<{ value: CourseSort; label: string; description: string }> = [
  { value: 'recent', label: 'Mais recentes', description: 'Adicionados por último' },
  { value: 'oldest', label: 'Mais antigos', description: 'Adicionados primeiro' },
  { value: 'longest', label: 'Mais longos', description: 'Maior carga horária' },
  { value: 'shortest', label: 'Mais curtos', description: 'Menor carga horária' },
  { value: 'most-skills', label: 'Mais tecnologias', description: 'Mais competências vinculadas' },
  { value: 'least-skills', label: 'Menos tecnologias', description: 'Menos competências vinculadas' },
];

function courseCreatedAt(course: Course) {
  const timestamp = Date.parse(course.createdAt);
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

export function CoursesPage({ deleted = false, refreshKey, onNewCourse, onEdit, notify, onChanged }: { deleted?: boolean; refreshKey: number; onNewCourse: () => void; onEdit: (course: Course) => void; notify: (message: string, type?: 'success' | 'error') => void; onChanged: () => void }) {
  const { search: routeSearch, navigate } = useRouter();
  const institutionId = routeSearch.get('instituicao') || '';
  const institutionName = routeSearch.get('nome') || '';
  const requestedCourseId = routeSearch.get('curso') || '';
  const openedFromUrl = useRef('');
  const filterMenuRef = useRef<HTMLDivElement | null>(null);

  const [courses, setCourses] = useState<Course[] | null>(null);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [visibility, setVisibility] = useState('');
  const [sort, setSort] = useState<CourseSort>('recent');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [error, setError] = useState('');
  const [pendingAction, setPendingAction] = useState<{ kind: 'trash' | 'destroy'; course: Course } | null>(null);
  const [actionBusy, setActionBusy] = useState(false);

  const load = useCallback(async () => {
    setError('');
    try {
      const params = new URLSearchParams({ limit: '60', deleted: String(deleted) });
      if (search) params.set('search', search);
      if (category) params.set('category', category);
      if (visibility) params.set('visibility', visibility);
      if (institutionId) params.set('institution', institutionId);
      const data = await api<{ courses: Course[] }>(`/api/courses?${params}`);
      setCourses(data.courses);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível carregar.');
    }
  }, [search, category, visibility, institutionId, deleted]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), search ? 250 : 0);
    return () => window.clearTimeout(timer);
  }, [load, refreshKey]);

  useEffect(() => {
    if (!filtersOpen) return;

    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!filterMenuRef.current?.contains(event.target as Node)) setFiltersOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setFiltersOpen(false);
    };

    document.addEventListener('mousedown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [filtersOpen]);

  useEffect(() => {
    if (!requestedCourseId || !courses || openedFromUrl.current === requestedCourseId) return;
    const target = courses.find((course) => course.id === requestedCourseId);
    if (!target) return;
    openedFromUrl.current = requestedCourseId;
    onEdit(target);
    navigate('/app/cursos', { replace: true });
  }, [courses, navigate, onEdit, requestedCourseId]);

  const sortedCourses = useMemo(() => {
    if (!courses) return null;

    const items = [...courses];
    const recentFirst = (a: Course, b: Course) => courseCreatedAt(b) - courseCreatedAt(a);

    items.sort((a, b) => {
      if (sort === 'oldest') return courseCreatedAt(a) - courseCreatedAt(b);
      if (sort === 'longest') return b.hoursMinutes - a.hoursMinutes || recentFirst(a, b);
      if (sort === 'shortest') return a.hoursMinutes - b.hoursMinutes || recentFirst(a, b);
      if (sort === 'most-skills') return b.skills.length - a.skills.length || recentFirst(a, b);
      if (sort === 'least-skills') return a.skills.length - b.skills.length || recentFirst(a, b);
      return recentFirst(a, b);
    });

    return items;
  }, [courses, sort]);

  const selectedSort = sortOptions.find((option) => option.value === sort) ?? sortOptions[0];
  const activeFilterCount = Number(Boolean(category)) + Number(Boolean(visibility));

  const clearFilters = () => {
    setCategory('');
    setVisibility('');
    setSort('recent');
  };

  const confirmPendingAction = async () => {
    if (!pendingAction) return;
    setActionBusy(true);
    try {
      if (pendingAction.kind === 'trash') {
        await api(`/api/courses/${pendingAction.course.id}`, { method: 'DELETE' });
        notify('Curso movido para a lixeira.');
      } else {
        await api(`/api/courses/${pendingAction.course.id}/permanent`, { method: 'DELETE' });
        notify('Curso excluído permanentemente.');
      }
      setPendingAction(null);
      onChanged();
    } catch (err) {
      notify(err instanceof Error ? err.message : pendingAction.kind === 'trash' ? 'Erro ao mover para a lixeira.' : 'Erro ao excluir permanentemente.', 'error');
    } finally {
      setActionBusy(false);
    }
  };
  const restore = async (course: Course) => { try { await api(`/api/courses/${course.id}/restore`, { method: 'POST' }); notify('Curso restaurado.'); onChanged(); } catch (err) { notify(err instanceof Error ? err.message : 'Erro ao restaurar.', 'error'); } };

  if (!courses && !error) return <PageSkeleton/>;
  return <div className={`page-stack courses-page ${deleted ? 'trash-page' : ''}`}>
    {!deleted ? <section className="panel filters-panel">
      <div className="courses-toolbar">
        <div className="search-field"><Icon name="search" size={18}/><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar curso, instituição ou onde foi realizado…"/></div>
        <div className="course-filter" ref={filterMenuRef}>
          <button className={`course-filter__trigger ${filtersOpen ? 'is-open' : ''}`} type="button" onClick={() => setFiltersOpen((open) => !open)} aria-expanded={filtersOpen} aria-haspopup="dialog">
            <Icon name="settings" size={18}/>
            <span><strong>Filtros</strong><small>{selectedSort.label}</small></span>
            {activeFilterCount ? <b>{activeFilterCount}</b> : null}
            <Icon className="course-filter__arrow" name="arrow" size={15}/>
          </button>

          {filtersOpen ? <div className="course-filter-menu" role="dialog" aria-label="Filtros dos cursos">
            <header className="course-filter-menu__header">
              <div><span className="eyebrow">Organizar cursos</span><h3>Filtros e ordem</h3></div>
              <button type="button" onClick={() => setFiltersOpen(false)} aria-label="Fechar filtros"><Icon name="close" size={17}/></button>
            </header>

            <section className="course-filter-menu__section">
              <span className="course-filter-menu__label">Ordenar por</span>
              <div className="course-sort-grid">
                {sortOptions.map((option) => <button className={sort === option.value ? 'selected' : ''} type="button" key={option.value} onClick={() => setSort(option.value)}>
                  <span><strong>{option.label}</strong><small>{option.description}</small></span>
                  {sort === option.value ? <Icon name="check" size={16}/> : null}
                </button>)}
              </div>
            </section>

            <section className="course-filter-menu__section course-filter-fields">
              <label>
                <span>Categoria</span>
                <select value={category} onChange={(e) => setCategory(e.target.value)}>
                  <option value="">Todas as categorias</option>
                  {categories.map((item) => <option key={item}>{item}</option>)}
                </select>
              </label>
              <label>
                <span>Visibilidade</span>
                <select value={visibility} onChange={(e) => setVisibility(e.target.value)}>
                  <option value="">Qualquer visibilidade</option>
                  <option value="private">Privado</option>
                  <option value="public">Público</option>
                  <option value="unlisted">Por link</option>
                </select>
              </label>
            </section>

            <footer className="course-filter-menu__footer">
              <button className="button button--ghost" type="button" onClick={clearFilters} disabled={!activeFilterCount && sort === 'recent'}>Limpar</button>
              <button className="button button--primary" type="button" onClick={() => setFiltersOpen(false)}>Concluir</button>
            </footer>
          </div> : null}
        </div>
      </div>
      {institutionId ? <div className="active-filter"><Icon name="folder" size={16}/><span>Mostrando cursos de <strong>{institutionName || 'uma instituição'}</strong></span><button onClick={() => navigate('/app/cursos')} aria-label="Remover filtro"><Icon name="close" size={15}/></button></div> : null}
    </section> : <section className="trash-intro"><span className="trash-intro__icon"><Icon name="trash" size={24}/></span><div><span className="eyebrow">Área de recuperação</span><h2>Itens removidos recentemente</h2><p>Restaure cursos ou faça a exclusão definitiva. Comprovantes permanecem protegidos enquanto o item estiver aqui.</p></div></section>}
    {error ? <EmptyState icon="info" title="Não foi possível carregar" text={error}/> : sortedCourses?.length ? <div className={deleted ? 'trash-grid' : 'card-grid'}>{sortedCourses.map((course, index) => deleted ? <article className="trash-card" style={{ '--course-index': index } as React.CSSProperties} key={course.id}>
      <header className="trash-card__header"><span className="course-symbol" title={course.category}><CourseCategoryIcon category={course.category} size={20}/></span><span className="trash-card__status"><Icon name="trash" size={13}/>Na lixeira</span></header>
      <div className="trash-card__content"><span className="eyebrow">{course.category}</span><h3>{course.title}</h3><p>{[course.institutionName, course.platformName].filter(Boolean).join(' · ')}</p><div className="chip-row"><span>{formatMinutes(course.hoursMinutes)}</span>{course.deletedAt ? <span>Removido em {formatDate(course.deletedAt)}</span> : null}</div></div>
      <footer className="trash-card__actions"><button className="button button--ghost" onClick={() => void restore(course)}><Icon name="upload" size={16}/>Restaurar</button><button className="button button--quiet-danger" onClick={() => setPendingAction({ kind: 'destroy', course })}><Icon name="trash" size={16}/>Excluir definitivamente</button></footer>
    </article> : <div className="course-card-wrap" style={{ '--course-index': index } as React.CSSProperties} key={course.id}><CourseCard course={course} onOpen={() => onEdit(course)} onEdit={() => onEdit(course)} onDelete={() => setPendingAction({ kind: 'trash', course })}/></div>)}</div> : <EmptyState icon={deleted ? 'trash' : 'courses'} title={deleted ? 'A lixeira está vazia' : 'Nenhum curso encontrado'} text={deleted ? 'Cursos excluídos aparecerão aqui.' : search || category || visibility || institutionId ? 'Tente remover algum filtro.' : 'Adicione seu primeiro curso para começar.'} action={!deleted && !search && !institutionId ? <button className="button button--primary" onClick={onNewCourse}><Icon name="plus"/>Adicionar curso</button> : undefined}/>} 
    <ConfirmDialog open={Boolean(pendingAction)} title={pendingAction?.kind === 'destroy' ? 'Excluir curso definitivamente' : 'Mover curso para a lixeira'} description={pendingAction?.kind === 'destroy' ? 'O curso, os comprovantes e os metadados serão removidos permanentemente. Esta ação não pode ser desfeita.' : 'O curso deixa de aparecer no seu histórico, mas pode ser restaurado depois pela lixeira.'} itemLabel={pendingAction?.course.title} confirmLabel={pendingAction?.kind === 'destroy' ? 'Excluir definitivamente' : 'Mover para a lixeira'} busy={actionBusy} onClose={() => !actionBusy && setPendingAction(null)} onConfirm={() => void confirmPendingAction()}/>
  </div>;
}
