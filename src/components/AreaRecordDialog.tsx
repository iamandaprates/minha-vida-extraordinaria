import { useState, type FormEvent } from 'react';
import type { LifeAreaSeed } from '../data/areas';
import { fromDateTimeLocalValue, toDateTimeLocalValue } from '../domain/dates';
import type { CalendarEvent, Goal, Project, Task } from '../domain/models';
import { areasActions, useAreasData } from '../services/areasStore';
import { Button } from './Button';

export type RecordKind = 'goals' | 'futureGoals' | 'projects' | 'actions' | 'commitments';
export const recordKindLabel: Record<RecordKind, string> = { goals: 'objetivo', futureGoals: 'objetivo futuro', projects: 'projeto', actions: 'ação', commitments: 'compromisso' };
const titlePlaceholder: Record<RecordKind, string> = { goals: 'Ex.: lançar a coleção de verão', futureGoals: 'Ex.: abrir uma loja física', projects: 'Ex.: site novo da marca', actions: 'Ex.: enviar o orçamento', commitments: 'Ex.: reunião com fornecedor' };
const statusOptions: Partial<Record<RecordKind, Array<[string, string]>>> = {
  goals: [['active', 'Em movimento'], ['paused', 'Pausado'], ['done', 'Concluído']],
  projects: [['active', 'Em movimento'], ['paused', 'Pausado'], ['complete', 'Concluído']],
  actions: [['open', 'Pendente'], ['done', 'Concluída']]
};
const priorityOptions: Array<[Task['priority'] & string, string]> = [['low', 'Baixa'], ['normal', 'Normal'], ['high', 'Alta']];

type Values = { title: string; description: string; due: string; priority: NonNullable<Task['priority']>; status: string; goalId: string; projectId: string; start: string; end: string };

export function AreaRecordDialog({ kind, area, recordId, onClose }: { kind: RecordKind; area: LifeAreaSeed; recordId?: string; onClose: () => void }) {
  const data = useAreasData();
  const areaGoals = data.goals.filter(item => item.areaId === area.id);
  const areaProjects = data.projects.filter(item => item.areaId === area.id);
  const [values, setValues] = useState<Values>(() => initialValues(kind, recordId, data));
  const [error, setError] = useState('');
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const editing = Boolean(recordId);
  const set = <K extends keyof Values>(key: K, value: Values[K]) => setValues(current => ({ ...current, [key]: value }));
  const label = recordKindLabel[kind];

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const title = values.title.trim();
    if (!title) return;
    if (kind === 'goals') areasActions.saveGoal({ ...data.goals.find(item => item.id === recordId), areaId: area.id, title, targetDate: values.due || undefined, status: values.status as Goal['status'] });
    if (kind === 'futureGoals') areasActions.saveIdea({ ...data.ideas.find(item => item.id === recordId), areaId: area.id, content: title });
    if (kind === 'projects') areasActions.saveProject({ ...data.projects.find(item => item.id === recordId), areaId: area.id, title, goalId: values.goalId || undefined, status: values.status as Project['status'] });
    if (kind === 'actions') areasActions.saveTask({ ...data.tasks.find(item => item.id === recordId), areaId: area.id, title, description: values.description.trim() || undefined, dueAt: values.due || undefined, priority: values.priority, goalId: values.goalId || undefined, projectId: values.projectId || undefined, status: values.status as Task['status'] });
    if (kind === 'commitments') {
      if (!values.start) { setError('Informe a data e o horário de início.'); return; }
      const startsAt = fromDateTimeLocalValue(values.start);
      const endsAt = values.end ? fromDateTimeLocalValue(values.end) : startsAt;
      if (endsAt < startsAt) { setError('O término precisa ser depois do início.'); return; }
      const previous = data.events.find(item => item.id === recordId);
      areasActions.saveEvent({ ...previous, areaId: area.id, title, startsAt, endsAt, status: previous?.status ?? 'planned', source: previous?.source ?? 'manual' } satisfies Omit<CalendarEvent, 'id' | 'userId' | 'createdAt' | 'updatedAt'>);
    }
    onClose();
  };

  const remove = () => {
    if (!recordId) return;
    if (kind === 'goals') areasActions.removeGoal(recordId);
    if (kind === 'futureGoals') areasActions.removeIdea(recordId);
    if (kind === 'projects') areasActions.removeProject(recordId);
    if (kind === 'actions') areasActions.removeTask(recordId);
    if (kind === 'commitments') areasActions.removeEvent(recordId);
    onClose();
  };

  return <div className="dialog-backdrop" onMouseDown={onClose} role="presentation"><form className="capture-dialog record-dialog" role="dialog" aria-modal="true" aria-label={`${editing ? 'Editar' : 'Adicionar'} ${label}`} onSubmit={submit} onMouseDown={event => event.stopPropagation()}>
    <button type="button" className="close" onClick={onClose} aria-label="Fechar">×</button>
    <span className="label">{editing ? 'EDITAR REGISTRO' : 'NOVA ENTRADA'}</span>
    <h2>{editing ? 'Editar' : 'Adicionar'} {label}</h2>
    <label className="field-label" htmlFor="record-title">Título</label>
    <input id="record-title" autoFocus value={values.title} onChange={event => set('title', event.target.value)} placeholder={titlePlaceholder[kind]} />
    {kind === 'actions' && <><label className="field-label" htmlFor="record-description">Descrição</label><textarea id="record-description" value={values.description} onChange={event => set('description', event.target.value)} placeholder="Detalhes que ajudam a executar (opcional)" /></>}
    {(kind === 'goals' || kind === 'actions') && <div className="field-row"><div><label className="field-label" htmlFor="record-due">Prazo</label><input id="record-due" type="date" value={values.due} onChange={event => set('due', event.target.value)} /></div>{kind === 'actions' && <div><label className="field-label" htmlFor="record-priority">Prioridade</label><select id="record-priority" value={values.priority} onChange={event => set('priority', event.target.value as Values['priority'])}>{priorityOptions.map(([value, text]) => <option key={value} value={value}>{text}</option>)}</select></div>}</div>}
    {kind === 'commitments' && <div className="field-row"><div><label className="field-label" htmlFor="record-start">Início</label><input id="record-start" type="datetime-local" value={values.start} onChange={event => set('start', event.target.value)} /></div><div><label className="field-label" htmlFor="record-end">Término (opcional)</label><input id="record-end" type="datetime-local" value={values.end} onChange={event => set('end', event.target.value)} /></div></div>}
    {(kind === 'projects' || kind === 'actions') && <><label className="field-label" htmlFor="record-goal">Objetivo relacionado</label><select id="record-goal" value={values.goalId} onChange={event => set('goalId', event.target.value)}><option value="">Nenhum</option>{areaGoals.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select></>}
    {kind === 'actions' && <><label className="field-label" htmlFor="record-project">Projeto relacionado</label><select id="record-project" value={values.projectId} onChange={event => set('projectId', event.target.value)}><option value="">Nenhum</option>{areaProjects.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select></>}
    {statusOptions[kind] && <><label className="field-label" htmlFor="record-status">Situação</label><select id="record-status" value={values.status} onChange={event => set('status', event.target.value)}>{statusOptions[kind]!.map(([value, text]) => <option key={value} value={value}>{text}</option>)}</select></>}
    {error && <p className="form-error" role="alert">{error}</p>}
    <div className="dialog-actions">{editing ? (confirmingDelete ? <button type="button" className="danger-button" onClick={remove}>Confirmar exclusão</button> : <button type="button" className="danger-button" onClick={() => setConfirmingDelete(true)}>Excluir</button>) : <span />}<Button className="pink-button keep-mobile" type="submit" disabled={!values.title.trim()}>Salvar</Button></div>
  </form></div>;
}

function initialValues(kind: RecordKind, recordId: string | undefined, data: ReturnType<typeof useAreasData>): Values {
  const blank: Values = { title: '', description: '', due: '', priority: 'normal', status: kind === 'actions' ? 'open' : 'active', goalId: '', projectId: '', start: '', end: '' };
  if (!recordId) return blank;
  if (kind === 'goals') { const item = data.goals.find(record => record.id === recordId); if (item) return { ...blank, title: item.title, due: item.targetDate ?? '', status: item.status }; }
  if (kind === 'futureGoals') { const item = data.ideas.find(record => record.id === recordId); if (item) return { ...blank, title: item.content }; }
  if (kind === 'projects') { const item = data.projects.find(record => record.id === recordId); if (item) return { ...blank, title: item.title, goalId: item.goalId ?? '', status: item.status }; }
  if (kind === 'actions') { const item = data.tasks.find(record => record.id === recordId); if (item) return { ...blank, title: item.title, description: item.description ?? '', due: item.dueAt?.slice(0, 10) ?? '', priority: item.priority ?? 'normal', status: item.status, goalId: item.goalId ?? '', projectId: item.projectId ?? '' }; }
  if (kind === 'commitments') { const item = data.events.find(record => record.id === recordId); if (item) return { ...blank, title: item.title, start: toDateTimeLocalValue(item.startsAt), end: item.endsAt !== item.startsAt ? toDateTimeLocalValue(item.endsAt) : '' }; }
  return blank;
}
