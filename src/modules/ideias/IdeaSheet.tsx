import { Archive, ArchiveRestore, ArrowRight, ExternalLink, ImagePlus, Plus, Trash2, X } from 'lucide-react';
import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { formatDay } from '../../lib/dates';
import { fitImage } from '../../lib/image';
import { useMive } from '../../store/useMive';
import { Button, Select, Sheet, cn } from '../../ui';

const fieldClass = 'rounded-2xl border border-line/15 bg-white/80 px-4 text-base font-medium outline-none focus:border-magenta focus:ring-4 focus:ring-magenta/15 dark:bg-white/5';
const safeUrl = (value: string) => { const text = value.trim(); if (!text) return undefined; const url = /^https?:\/\//i.test(text) ? text : `https://${text}`; try { return new URL(url).href; } catch { return undefined; } };

/** Ideia aberta: descrição longa, links, imagem, tags e "Transformar em tarefa". */
export function IdeaSheet({ ideaId, onClose }: { ideaId: string; onClose: () => void }) {
  const state = useMive();
  const idea = state.ideas.find(item => item.id === ideaId);
  const [link, setLink] = useState('');
  const [newTag, setNewTag] = useState('');
  const [error, setError] = useState<string>();
  const [projectId, setProjectId] = useState(() => state.projects.find(project => project.tag && idea?.tags.some(tag => tag.toLowerCase() === project.tag!.toLowerCase()))?.id ?? '');
  const [confirm, setConfirm] = useState(false);
  const file = useRef<HTMLInputElement>(null);
  if (!idea) return null;
  const task = state.tasks.find(item => item.id === idea.taskId);
  const taskProject = state.projects.find(project => project.id === task?.projectId);
  const update = state.updateIdea.bind(null, idea.id);
  const toggleTag = (tag: string) => update({ tags: idea.tags.includes(tag) ? idea.tags.filter(item => item !== tag) : [...idea.tags, tag] });
  const addLink = () => { const url = safeUrl(link); if (!url) { setError('Esse link não parece válido.'); return; } update({ links: [...(idea.links ?? []), url] }); setLink(''); setError(undefined); };
  const attach = async (picked?: File) => { if (!picked) return; try { update({ image: await fitImage(picked) }); setError(undefined); } catch (reason) { setError((reason as Error).message); } };

  return <Sheet open onClose={onClose} title="Ideia" eyebrow={`Capturada em ${formatDay(idea.createdAt.slice(0, 10), "d 'de' MMMM")}`}>
    <div className="grid gap-5">
      <label className="grid gap-1.5"><span className="text-sm font-semibold">Título</span><input value={idea.title} onChange={event => update({ title: event.target.value })} onBlur={event => { if (!event.target.value.trim()) update({ title: 'Ideia sem título' }); }} className={cn(fieldClass, 'h-12 text-lg font-semibold')} /></label>
      <label className="grid gap-1.5"><span className="text-sm font-semibold">Descrição</span><textarea value={idea.description ?? ''} onChange={event => update({ description: event.target.value || undefined })} rows={6} placeholder="Desenvolva a ideia: para quem, por quê, como seria a primeira versão." className={cn(fieldClass, 'py-3 leading-relaxed')} /></label>

      <section className="grid gap-2" aria-label="Tags">
        <span className="text-sm font-semibold">Tags</span>
        <div className="flex flex-wrap gap-2">{state.ideaTags.map(tag => { const on = idea.tags.includes(tag); return <button key={tag} type="button" onClick={() => toggleTag(tag)} aria-pressed={on} className={cn('h-10 rounded-full px-3.5 text-sm font-semibold transition', on ? 'bg-ciano text-violeta' : 'border border-line/15 text-ink-soft hover:border-ciano')}>#{tag}</button>; })}</div>
        <form className="flex gap-2" onSubmit={event => { event.preventDefault(); const tag = state.addIdeaTag(newTag); if (tag && !idea.tags.includes(tag)) update({ tags: [...idea.tags, tag] }); setNewTag(''); }}>
          <label className="sr-only" htmlFor="nova-tag-ideia">Nova tag</label>
          <input id="nova-tag-ideia" value={newTag} onChange={event => setNewTag(event.target.value)} placeholder="#nova-tag" className={cn(fieldClass, 'h-11 min-w-0 flex-1 text-sm')} />
          <Button type="submit" variant="secondary" size="icon" aria-label="Criar tag" disabled={!newTag.trim()}><Plus size={18} strokeWidth={2} /></Button>
        </form>
      </section>

      <section className="grid gap-2" aria-label="Links">
        <span className="text-sm font-semibold">Links</span>
        <ul className="grid gap-1">{(idea.links ?? []).map((item, index) => <li key={`${item}-${index}`} className="flex items-center gap-2 text-sm"><a href={item} target="_blank" rel="noopener noreferrer" className="flex min-h-[44px] min-w-0 flex-1 items-center gap-2 font-medium text-magenta underline-offset-2 hover:underline"><ExternalLink size={15} strokeWidth={1.75} className="shrink-0" /><span className="truncate">{item.replace(/^https?:\/\//, '')}</span></a><button type="button" onClick={() => update({ links: idea.links!.filter((_, position) => position !== index) })} aria-label="Remover link" className="grid h-11 w-11 place-items-center rounded-full text-muted hover:text-magenta"><X size={15} strokeWidth={1.75} /></button></li>)}</ul>
        <form className="flex gap-2" onSubmit={event => { event.preventDefault(); addLink(); }}>
          <label className="sr-only" htmlFor="novo-link">Novo link</label>
          <input id="novo-link" type="text" inputMode="url" autoCapitalize="off" autoCorrect="off" value={link} onChange={event => setLink(event.target.value)} placeholder="https://" className={cn(fieldClass, 'h-11 min-w-0 flex-1 text-sm')} />
          <Button type="submit" variant="secondary" size="icon" aria-label="Adicionar link" disabled={!link.trim()}><Plus size={18} strokeWidth={2} /></Button>
        </form>
      </section>

      <section className="grid gap-2" aria-label="Imagem">
        <span className="text-sm font-semibold">Imagem</span>
        {idea.image ? <div className="relative overflow-hidden rounded-2xl"><img src={idea.image} alt={`Imagem da ideia ${idea.title}`} className="max-h-72 w-full object-cover" /><button type="button" onClick={() => update({ image: undefined })} aria-label="Remover imagem" className="absolute right-2 top-2 grid h-11 w-11 place-items-center rounded-full bg-white/90 text-violeta shadow-glass hover:text-magenta"><Trash2 size={16} strokeWidth={1.75} /></button></div>
          : <Button variant="secondary" onClick={() => file.current?.click()} className="justify-self-start"><ImagePlus size={17} strokeWidth={1.75} /> Anexar imagem</Button>}
        <input ref={file} type="file" accept="image/*" className="hidden" aria-label="Escolher imagem" onChange={event => { void attach(event.target.files?.[0]); event.target.value = ''; }} />
        <p className="text-xs text-muted">Fica salva só neste aparelho e entra no backup.</p>
      </section>
      {error && <p role="alert" className="text-sm font-medium text-magenta">{error}</p>}

      <section className="grid gap-3 rounded-3xl bg-rosa/70 p-4 dark:bg-magenta/10" aria-label="Transformar em tarefa">
        {task ? <p className="text-sm font-medium">Esta ideia virou a tarefa <strong className="font-semibold">“{task.title}”</strong>{taskProject && <> em <Link to={`/projetos/${taskProject.id}`} onClick={onClose} className="inline-flex items-center gap-1 font-semibold text-magenta">{taskProject.name} <ArrowRight size={14} strokeWidth={1.75} /></Link></>}.</p>
          : <>
            <Select label="Enviar para o projeto" value={projectId} onChange={event => setProjectId(event.target.value)} options={[{ value: '', label: 'Sem projeto · tarefas soltas' }, ...state.projects.filter(project => project.status !== 'done').map(project => ({ value: project.id, label: project.name }))]} />
            <Button onClick={() => state.ideaToTask(idea.id, projectId || undefined)}>Transformar em tarefa</Button>
          </>}
      </section>

      <div className="flex flex-wrap gap-2">
        <Button variant="ghost" size="sm" onClick={() => { update({ archivedAt: idea.archivedAt ? undefined : new Date().toISOString() }); onClose(); }}>{idea.archivedAt ? <><ArchiveRestore size={15} strokeWidth={1.75} /> Desarquivar</> : <><Archive size={15} strokeWidth={1.75} /> Arquivar</>}</Button>
        {!confirm ? <Button variant="ghost" size="sm" onClick={() => setConfirm(true)}><Trash2 size={15} strokeWidth={1.75} /> Excluir</Button> : <Button variant="secondary" size="sm" onClick={() => { state.deleteIdea(idea.id); onClose(); }}>Confirmar exclusão</Button>}
      </div>
    </div>
  </Sheet>;
}
