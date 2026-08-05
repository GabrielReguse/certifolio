import { formatDate, formatMinutes } from '../lib/format';
import type { Course } from '../types';
import { Icon } from './Icon';
import { CourseCategoryIcon } from './CourseCategoryIcon';
import { RatingStars } from './RatingStars';

const statusLabels: Record<Course['status'], string> = {
  planned: 'Planejado',
  in_progress: 'Em andamento',
  completed: 'Concluído',
  abandoned: 'Interrompido',
  expired: 'Expirado',
};

export function CourseCard({ course, onEdit, onDelete, onOpen }: { course: Course; onEdit: () => void; onDelete: () => void; onOpen: () => void }) {
  const institutionLine = [course.institutionName, course.platformName].filter(Boolean).join(' · ');

  return <article className="course-card" tabIndex={0} onKeyDown={(event) => {
    if (event.key === 'Enter') onOpen();
  }}>
    <div className="course-card__glow" aria-hidden="true"/>
    <div className="course-card__top">
      <span className="course-symbol" title={course.category}><CourseCategoryIcon category={course.category} size={22}/></span>
      <span className={`privacy-chip privacy-chip--${course.visibility}`}><Icon name={course.visibility === 'public' ? 'globe' : 'lock'} size={13}/>{course.visibility === 'public' ? 'Público' : course.visibility === 'unlisted' ? 'Por link' : 'Privado'}</span>
    </div>
    <button className="course-card__body" onClick={onOpen}>
      <span className="eyebrow">{statusLabels[course.status]}</span>
      <h3>{course.title}</h3>
      <p>{institutionLine}</p>
      <div className="chip-row"><span>{formatMinutes(course.hoursMinutes)}</span><span>{course.category}</span><span>{formatDate(course.endDate || course.startDate)}</span></div>
    </button>
    <div className="course-card__skills">{course.skills.slice(0, 3).map((skill) => <span key={skill}>{skill}</span>)}{course.skills.length > 3 && <span>+{course.skills.length - 3}</span>}</div>
    <div className="course-card__reveal">
      <p>{course.description || `Curso registrado em ${course.institutionName}.`}</p>
      <button type="button" className="course-card__open" onClick={onOpen}>Ver detalhes <Icon name="arrow" size={15}/></button>
    </div>
    <footer className="course-card__footer"><RatingStars rating={course.rating}/><div><button className="icon-button" onClick={onEdit} aria-label="Editar"><Icon name="edit" size={17}/></button><button className="icon-button icon-button--danger" onClick={onDelete} aria-label="Excluir"><Icon name="trash" size={17}/></button></div></footer>
  </article>;
}
