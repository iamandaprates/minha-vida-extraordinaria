import { Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { areas } from '../../data/areas';
import { normalizeTag } from '../../lib/selectors';
import { useMive } from '../../store/useMive';
import type { AreaId, Project } from '../../types';
import { Button, Input, Modal, Select } from '../../ui';

export const statusLabel: Record<Project['status'], string> = { active: 'Ativo', paused: 'Pausado', done: 'Concluído' };

/** Cria ou edita um projeto vinculado a uma área da vida. */
export function ProjectModal({ project, onClose }: { project?: Project; onClose: () => void }) {
  const state = useMive();
  const navigate = useNavigate();
  const [name, setName] = useState(project?.name ?? '');
  const [areaId, setAreaId] = useState<AreaId>(project?.areaId ?? 'profissional');
  const [tag, setTag] = useState(project?.tag ?? '');
  const [status, setStatus] = useState<Project['status']>(project?.status ?? 'active');
  const [confirm, setConfirm] = useState(false);
  const save = () => {
    if (!name.trim()) return;
    const change = { name: name.trim(), areaId, tag: normalizeTag(tag) || undefined, status };
    if (project) state.updateProject(project.id, change);
    else navigate(`/projetos/${state.addProject(change).id}`);
    onClose();
  };
  return <Modal open onClose={onClose} title={project ? 'Editar projeto' : 'Novo projeto'} eyebrow="Projetos">
    <form className="grid gap-4" onSubmit={event => { event.preventDefault(); save(); }}>
      <Input label="Nome do projeto" value={name} onChange={event => setName(event.target.value)} placeholder="Ex.: CAVU · moda fitness" autoFocus />
      <div className="grid gap-3 sm:grid-cols-2">
        <Select label="Área da vida" value={areaId} onChange={event => setAreaId(event.target.value as AreaId)} options={areas.map(area => ({ value: area.id, label: area.name }))} />
        <Select label="Status" value={status} onChange={event => setStatus(event.target.value as Project['status'])} options={(Object.keys(statusLabel) as Project['status'][]).map(value => ({ value, label: statusLabel[value] }))} />
      </div>
      <Input label="Tag de ideias" value={tag} onChange={event => setTag(event.target.value)} placeholder="CAVU" hint="Ideias com essa #tag aparecem dentro do projeto." />
      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={!name.trim()}>{project ? 'Salvar' : 'Criar projeto'}</Button>
        {project && !confirm && <Button variant="ghost" onClick={() => setConfirm(true)}><Trash2 size={16} strokeWidth={1.75} /> Excluir</Button>}
        {project && confirm && <Button variant="secondary" onClick={() => { state.deleteProject(project.id); onClose(); navigate('/projetos'); }}>Confirmar exclusão · as tarefas ficam soltas</Button>}
      </div>
    </form>
  </Modal>;
}
