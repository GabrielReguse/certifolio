import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { api, uploadFile } from '../lib/api';
import type { Course, CourseInput } from '../types';
import { Icon } from './Icon';
import { Modal } from './Modal';

const initial: CourseInput = {
  title: '', institutionName: '', institutionWebsite: '', platformName: '', description: '', category: 'Programação', status: 'completed',
  hoursMinutes: 0, startDate: '', endDate: '', issuedAt: '', expiresAt: '', rating: 10, credentialId: '', verificationUrl: '',
  visibility: 'private', certificateVisibility: 'private', isFeatured: false, notes: '', skills: [],
};

const categories = ['Programação', 'Design', 'Negócios', 'Idiomas', 'Educação', 'Dados', 'Segurança', 'Outros'];

function fromCourse(course: Course): CourseInput {
  return {
    title: course.title,
    institutionName: course.institutionName,
    institutionWebsite: course.institutionWebsite,
    platformName: course.platformName,
    description: course.description,
    category: course.category,
    status: course.status,
    hoursMinutes: course.hoursMinutes,
    startDate: course.startDate || '',
    endDate: course.endDate || '',
    issuedAt: course.issuedAt || '',
    expiresAt: course.expiresAt || '',
    rating: course.rating,
    credentialId: course.credentialId,
    verificationUrl: course.verificationUrl,
    visibility: course.visibility,
    certificateVisibility: course.certificateVisibility,
    isFeatured: course.isFeatured,
    notes: course.notes,
    skills: course.skills,
  };
}

export function CourseFormModal({ open, course, onClose, onSaved, notify }: { open: boolean; course: Course | null; onClose: () => void; onSaved: (course: Course) => void; notify: (message: string, type?: 'success' | 'error') => void }) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<CourseInput>(initial);
  const [hours, setHours] = useState('');
  const [skillsText, setSkillsText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const isEditing = Boolean(course);

  useEffect(() => {
    if (!open) return;
    const next = course ? fromCourse(course) : initial;
    setForm(next);
    setHours(next.hoursMinutes ? String(next.hoursMinutes / 60) : '');
    setSkillsText(next.skills.join(', '));
    setFile(null);
    setStep(1);
  }, [open, course]);

  const stepValid = useMemo(() => {
    if (step === 1) return form.title.trim().length >= 2 && form.institutionName.trim().length >= 2;
    if (step === 2) return form.hoursMinutes >= 0;
    return true;
  }, [form, step]);

  const update = <K extends keyof CourseInput>(key: K, value: CourseInput[K]) => setForm((current) => ({ ...current, [key]: value }));

  const copyShareLink = async () => {
    if (!course) return;
    const link = `${window.location.origin}/c/${course.id}`;
    try {
      await navigator.clipboard.writeText(link);
      notify('Link do curso copiado.');
    } catch {
      const helper = document.createElement('textarea');
      helper.value = link;
      helper.setAttribute('readonly', '');
      helper.style.position = 'fixed';
      helper.style.opacity = '0';
      document.body.appendChild(helper);
      helper.select();
      const copied = document.execCommand('copy');
      helper.remove();
      notify(copied ? 'Link do curso copiado.' : 'Não foi possível copiar o link.', copied ? 'success' : 'error');
    }
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (step < 3) { setStep((current) => current + 1); return; }
    setSaving(true);
    try {
      const payload = { ...form, skills: skillsText.split(',').map((item) => item.trim()).filter(Boolean) };
      const result = course
        ? await api<{ course: Course }>(`/api/courses/${course.id}`, { method: 'PATCH', body: payload })
        : await api<{ course: Course }>('/api/courses', { method: 'POST', body: payload });

      let uploadFailed = false;
      if (file) {
        try { await uploadFile(`/api/files/courses/${result.course.id}`, file); }
        catch (error) {
          uploadFailed = true;
          notify(`O curso foi salvo, mas o comprovante não: ${error instanceof Error ? error.message : 'falha no upload.'}`, 'error');
        }
      }

      onSaved(result.course);
      if (!uploadFailed) notify(course ? 'Curso atualizado.' : 'Curso adicionado ao seu Certifólio.');
      onClose();
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Não foi possível salvar o curso.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return <Modal open={open} title={isEditing ? 'Editar curso' : 'Novo curso'} subtitle="Cadastre a formação com clareza. O comprovante continua privado por padrão." onClose={onClose} wide>
    <div className="stepper">{[1,2,3].map((number) => <button key={number} type="button" className={step === number ? 'active' : step > number ? 'done' : ''} onClick={() => number <= step && setStep(number)}><span>{step > number ? <Icon name="check" size={15}/> : number}</span>{['Curso', 'Período', 'Comprovação'][number - 1]}</button>)}</div>
    <form onSubmit={submit} className="course-form">
      {step === 1 && <div className="form-grid">
        <label className="field field--full"><span>Nome do curso</span><input autoFocus value={form.title} onChange={(e) => update('title', e.target.value)} placeholder="Ex.: Fundamentos de UX Design" required /></label>
        <label className="field"><span>Instituição emissora</span><input value={form.institutionName} onChange={(e) => update('institutionName', e.target.value)} placeholder="Ex.: Google, IFC ou Alura" required /><small>Quem emitiu ou assina o certificado.</small></label>
        <label className="field"><span>Onde o curso foi realizado? <em>Opcional</em></span><input value={form.platformName} onChange={(e) => update('platformName', e.target.value)} placeholder="Ex.: Coursera, Curso em Vídeo ou presencial" /><small>Informe o site, ambiente ou modalidade. Não repita a instituição se foi no próprio site dela.</small></label>
        <label className="field field--full"><span>Site da instituição <em>Opcional</em></span><input type="url" value={form.institutionWebsite || ''} onChange={(e) => update('institutionWebsite', e.target.value)} placeholder="https://instituicao.com" /></label>
        <label className="field"><span>Categoria</span><select value={form.category} onChange={(e) => update('category', e.target.value)}>{categories.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label className="field"><span>Situação</span><select value={form.status} onChange={(e) => update('status', e.target.value as CourseInput['status'])}><option value="completed">Concluído</option><option value="in_progress">Em andamento</option><option value="planned">Planejado</option><option value="abandoned">Interrompido</option><option value="expired">Expirado</option></select></label>
        <label className="field field--full"><span>Descrição</span><textarea value={form.description} onChange={(e) => update('description', e.target.value)} placeholder="Um resumo curto sobre o conteúdo e a experiência." /></label>
      </div>}

      {step === 2 && <div className="form-grid">
        <label className="field"><span>Carga horária</span><div className="input-suffix"><input type="number" min="0" step="0.5" value={hours} onChange={(e) => { setHours(e.target.value); update('hoursMinutes', Math.round(Number(e.target.value || 0) * 60)); }} placeholder="20"/><b>horas</b></div></label>
        <label className="field"><span>Data de emissão</span><input type="date" value={form.issuedAt || ''} onChange={(e) => update('issuedAt', e.target.value)} /></label>
        <label className="field"><span>Início</span><input type="date" value={form.startDate || ''} onChange={(e) => update('startDate', e.target.value)} /></label>
        <label className="field"><span>Conclusão</span><input type="date" value={form.endDate || ''} onChange={(e) => update('endDate', e.target.value)} /></label>
        <label className="field"><span>Validade</span><input type="date" value={form.expiresAt || ''} onChange={(e) => update('expiresAt', e.target.value)} /></label>
        <label className="field"><span>Avaliação</span><div className="rating-picker">{[1,2,3,4,5].map((star) => <button type="button" key={star} className={form.rating / 2 >= star ? 'active' : ''} onClick={() => update('rating', star * 2)}>★</button>)}</div></label>
        <label className="field field--full"><span>Habilidades desenvolvidas</span><input value={skillsText} onChange={(e) => setSkillsText(e.target.value)} placeholder="JavaScript, APIs, DOM — separe por vírgulas" /><small>Essas palavras formam o mapa de competências do dashboard e do perfil público.</small></label>
      </div>}

      {step === 3 && <div className="form-grid">
        <label className="field"><span>ID da credencial</span><input value={form.credentialId} onChange={(e) => update('credentialId', e.target.value)} placeholder="ABC-12345" /></label>
        <label className="field"><span>Link de verificação</span><input type="url" value={form.verificationUrl} onChange={(e) => update('verificationUrl', e.target.value)} placeholder="https://..." /></label>
        <label className="upload-field field--full"><input type="file" accept="application/pdf,image/jpeg,image/png,image/webp" onChange={(e) => setFile(e.target.files?.[0] || null)} /><Icon name="upload" size={24}/><strong>{file ? file.name : isEditing && course?.fileCount ? 'Substituir ou adicionar comprovante' : 'Selecionar certificado'}</strong><span>PDF, JPG, PNG ou WebP · máximo 20 MB</span></label>
        {isEditing && course && course.fileCount > 0 && <div className="field field--full"><a className="certificate-link" href={`/api/files/courses/${course.id}/primary`} target="_blank" rel="noreferrer"><Icon name="eye" size={17}/>Abrir comprovante atual</a></div>}
        <label className="field"><span>Visibilidade do curso</span><select value={form.visibility} onChange={(e) => update('visibility', e.target.value as CourseInput['visibility'])}><option value="private">Privado</option><option value="public">Público</option><option value="unlisted">Somente por link</option></select></label>
        <label className="field"><span>Comprovante</span><select value={form.certificateVisibility === 'public' ? 'public' : 'private'} onChange={(e) => update('certificateVisibility', e.target.value as CourseInput['certificateVisibility'])}><option value="private">Não publicar o arquivo</option><option value="public">Publicar o arquivo original</option></select><small>Publicar libera o arquivo enviado. Confira antes se ele contém CPF, assinatura ou outros dados pessoais.</small></label>
        {isEditing && course && form.visibility === 'unlisted' && <div className="share-link-box field--full"><div><Icon name="external" size={18}/><span><strong>Link compartilhável</strong><small>{`${window.location.origin}/c/${course.id}`}</small></span></div><button type="button" className="button button--ghost" onClick={() => void copyShareLink()}>Copiar link</button></div>}
        <label className="field field--full"><span>Observações privadas</span><textarea value={form.notes} onChange={(e) => update('notes', e.target.value)} placeholder="Anotações que só você verá." /></label>
        <label className="switch-row field--full"><input type="checkbox" checked={form.isFeatured} onChange={(e) => update('isFeatured', e.target.checked)} /><span><strong>Destacar no perfil</strong><small>O curso aparece antes dos demais quando for público.</small></span></label>
      </div>}

      <footer className="modal__actions"><button type="button" className="button button--ghost" onClick={step === 1 ? onClose : () => setStep((current) => current - 1)}>{step === 1 ? 'Cancelar' : 'Voltar'}</button><button type="submit" className="button button--primary" disabled={!stepValid || saving}>{saving ? 'Salvando…' : step < 3 ? 'Continuar' : isEditing ? 'Salvar alterações' : 'Adicionar curso'}</button></footer>
    </form>
  </Modal>;
}
