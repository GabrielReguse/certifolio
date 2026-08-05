import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { EmptyState } from '../components/EmptyState';
import { Icon } from '../components/Icon';
import { PageSkeleton } from '../components/Loading';
import { Modal } from '../components/Modal';
import { api } from '../lib/api';
import { formatDate } from '../lib/format';
import type { GoalInput, GoalMetric, LearningGoal } from '../types';

type Draft = GoalInput;

const emptyDraft: Draft = {
  title: '',
  metric: 'hours',
  targetValue: 100,
  deadline: '',
  isPinned: false,
};

function valueLabel(value: number, metric: GoalMetric) {
  if (metric === 'courses') return `${Math.max(0, Math.round(value))} ${Math.round(value) === 1 ? 'curso' : 'cursos'}`;
  const rounded = Math.round(value * 10) / 10;
  return `${Number.isInteger(rounded) ? rounded.toFixed(0) : rounded.toFixed(1)}h`;
}

export function GoalsPage({ refreshKey, notify, onChanged }: {
  refreshKey: number;
  notify: (message: string, type?: 'success' | 'error' | 'info') => void;
  onChanged: () => void;
}) {
  const [items, setItems] = useState<LearningGoal[] | null>(null);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<LearningGoal | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState('');
  const [pendingDelete, setPendingDelete] = useState<LearningGoal | null>(null);

  const load = useCallback(async () => {
    setError('');
    try {
      const result = await api<{ goals: LearningGoal[] }>('/api/goals');
      setItems(result.goals);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível carregar suas metas.');
    }
  }, []);

  useEffect(() => { void load(); }, [load, refreshKey]);

  const openCreate = () => {
    setEditing(null);
    setDraft(emptyDraft);
    setModalOpen(true);
  };

  const openEdit = (goal: LearningGoal) => {
    setEditing(goal);
    setDraft({
      title: goal.title,
      metric: goal.metric,
      targetValue: goal.targetValue,
      deadline: goal.deadline || '',
      isPinned: goal.isPinned,
    });
    setModalOpen(true);
  };

  const save = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      await api(editing ? `/api/goals/${editing.id}` : '/api/goals', {
        method: editing ? 'PATCH' : 'POST',
        body: {
          ...draft,
          targetValue: Number(draft.targetValue),
          deadline: draft.deadline || '',
        },
      });
      setModalOpen(false);
      notify(editing ? 'Meta atualizada.' : 'Meta criada.');
      await load();
      onChanged();
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Não foi possível salvar a meta.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const togglePinned = async (goal: LearningGoal) => {
    setBusyId(goal.id);
    try {
      await api(`/api/goals/${goal.id}`, { method: 'PATCH', body: { isPinned: !goal.isPinned } });
      notify(goal.isPinned ? 'Meta removida do dashboard.' : 'Meta fixada no dashboard.');
      await load();
      onChanged();
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Não foi possível alterar a meta.', 'error');
    } finally {
      setBusyId('');
    }
  };

  const remove = async () => {
    if (!pendingDelete) return;
    setBusyId(pendingDelete.id);
    try {
      await api(`/api/goals/${pendingDelete.id}`, { method: 'DELETE' });
      notify('Meta excluída.');
      setPendingDelete(null);
      await load();
      onChanged();
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Não foi possível excluir a meta.', 'error');
    } finally {
      setBusyId('');
    }
  };

  if (!items && !error) return <PageSkeleton/>;
  if (error) return <EmptyState icon="info" title="Não foi possível carregar as metas" text={error} action={<button className="button button--primary" onClick={() => void load()}>Tentar novamente</button>}/>;

  return <div className="page-stack goals-page">
    <section className="section-intro goals-intro">
      <div><span className="eyebrow">Evolução do seu jeito</span><h2>Crie metas sem limite.</h2><p>Acompanhe horas ou quantidade de cursos e fixe uma meta por vez no dashboard.</p></div>
      <button className="button button--primary" onClick={openCreate}><Icon name="plus" size={18}/>Nova meta</button>
    </section>

    {items?.length ? <div className="goal-grid">{items.map((goal) => {
      const progress = Math.min(100, Math.max(0, goal.percent));
      return <article className={`goal-card ${goal.isPinned ? 'goal-card--pinned' : ''}`} key={goal.id}>
        <header>
          <span className="goal-card__icon"><Icon name={goal.metric === 'hours' ? 'clock' : 'courses'} size={20}/></span>
          <div><span>{goal.metric === 'hours' ? 'Meta de horas' : 'Meta de cursos'}</span><h3>{goal.title}</h3></div>
          {goal.isPinned ? <b className="goal-card__badge"><Icon name="pin" size={13}/>Fixada</b> : null}
        </header>
        <div className="goal-card__numbers"><strong>{Math.round(progress)}%</strong><span>{valueLabel(goal.currentValue, goal.metric)} de {valueLabel(goal.targetValue, goal.metric)}</span></div>
        <div className="goal-card__progress" aria-label={`${Math.round(progress)}% concluído`}><i style={{ width: `${progress}%` }}/></div>
        <div className="goal-card__meta">
          <span>{goal.remainingValue > 0 ? `Faltam ${valueLabel(goal.remainingValue, goal.metric)}` : 'Meta concluída'}</span>
          <span>{goal.deadline ? `Prazo: ${formatDate(goal.deadline)}` : 'Sem prazo'}</span>
        </div>
        <footer>
          <button className="button button--ghost" disabled={busyId === goal.id} onClick={() => void togglePinned(goal)}><Icon name="pin" size={16}/>{goal.isPinned ? 'Desafixar' : 'Fixar no dashboard'}</button>
          <div><button className="icon-button" title="Editar meta" disabled={busyId === goal.id} onClick={() => openEdit(goal)}><Icon name="edit" size={17}/></button><button className="icon-button" title="Excluir meta" disabled={busyId === goal.id} onClick={() => setPendingDelete(goal)}><Icon name="trash" size={17}/></button></div>
        </footer>
      </article>;
    })}</div> : <EmptyState icon="target" title="Você ainda não criou nenhuma meta" text="Crie quantas quiser. Somente a que estiver fixada aparecerá como porcentagem no dashboard." action={<button className="button button--primary" onClick={openCreate}><Icon name="plus" size={17}/>Criar primeira meta</button>}/>}

    <ConfirmDialog open={Boolean(pendingDelete)} title="Excluir meta" description="A meta será removida do acompanhamento e deixará de aparecer no dashboard. Seus cursos continuam intactos." itemLabel={pendingDelete?.title} confirmLabel="Excluir meta" busy={Boolean(busyId)} onClose={() => !busyId && setPendingDelete(null)} onConfirm={() => void remove()}/>

    <Modal open={modalOpen} title={editing ? 'Editar meta' : 'Nova meta'} subtitle="A evolução é calculada automaticamente usando seus cursos cadastrados." onClose={() => !saving && setModalOpen(false)}>
      <form className="goal-form" onSubmit={save}>
        <div className="form-grid">
          <label className="field field--full"><span>Nome da meta</span><input value={draft.title} onChange={(event) => setDraft((value) => ({ ...value, title: event.target.value }))} placeholder="Ex.: Completar 300 horas em 2026" minLength={2} maxLength={100} required/></label>
          <label className="field"><span>O que deseja acompanhar?</span><select value={draft.metric} onChange={(event) => setDraft((value) => ({ ...value, metric: event.target.value as GoalMetric, targetValue: event.target.value === 'hours' ? 100 : 5 }))}><option value="hours">Horas de estudo</option><option value="courses">Cursos cadastrados</option></select></label>
          <label className="field"><span>{draft.metric === 'hours' ? 'Quantidade de horas' : 'Quantidade de cursos'}</span><input type="number" min="1" max="1000000" step="1" value={draft.targetValue} onChange={(event) => setDraft((value) => ({ ...value, targetValue: Number(event.target.value) }))} required/></label>
          <label className="field"><span>Prazo <em>(opcional)</em></span><input type="date" value={draft.deadline || ''} onChange={(event) => setDraft((value) => ({ ...value, deadline: event.target.value }))}/></label>
          <label className="goal-pin-choice"><input type="checkbox" checked={draft.isPinned} onChange={(event) => setDraft((value) => ({ ...value, isPinned: event.target.checked }))}/><span><Icon name="pin" size={18}/><strong>Fixar no dashboard</strong><small>Substitui a meta atualmente fixada, caso exista.</small></span></label>
        </div>
        <footer className="modal-actions"><button type="button" className="button button--ghost" disabled={saving} onClick={() => setModalOpen(false)}>Cancelar</button><button className="button button--primary" disabled={saving}>{saving ? 'Salvando…' : editing ? 'Salvar alterações' : 'Criar meta'}</button></footer>
      </form>
    </Modal>
  </div>;
}
