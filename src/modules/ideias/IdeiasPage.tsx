import { ArrowRight, Image as ImageIcon, Lightbulb, Link2, Plus, Settings2 } from 'lucide-react';
import { useRef, useState } from 'react';
import { parseCapture } from '../../lib/selectors';
import { useMive } from '../../store/useMive';
import { Button, GlassCard, Tag, cn } from '../../ui';
import { EmptyState, Page, PageHeader } from '../GuidePage';
import { IdeaSheet } from './IdeaSheet';
import { TagManager } from './TagManager';

/** Geladeira de Potencial: capture em 1 clique, decida depois. */
export function IdeiasPage() {
  const state = useMive();
  const [filter, setFilter] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [managing, setManaging] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const visible = state.ideas.filter(idea => Boolean(idea.archivedAt) === showArchived && (!filter || idea.tags.some(tag => tag.toLowerCase() === filter.toLowerCase())));
  const count = (tag: string) => state.ideas.filter(idea => !idea.archivedAt && idea.tags.some(item => item.toLowerCase() === tag.toLowerCase())).length;

  return <Page>
    <PageHeader eyebrow="Ideias" title="Geladeira de Potencial" subtitle="Capture agora, em uma linha. Use #tag para organizar. A decisão fica para depois." />
    <QuickCapture tag={filter ?? undefined} />
    <div className="mb-5 mt-6 flex flex-wrap items-center gap-2" role="group" aria-label="Filtrar ideias por tag">
      <FilterChip active={!filter} onClick={() => setFilter(null)}>Todas · {state.ideas.filter(idea => !idea.archivedAt).length}</FilterChip>
      {state.ideaTags.map(tag => <FilterChip key={tag} active={filter === tag} onClick={() => setFilter(filter === tag ? null : tag)}>#{tag} · {count(tag)}</FilterChip>)}
      <button type="button" onClick={() => setManaging(true)} className="inline-flex h-11 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-ink-soft hover:text-magenta"><Settings2 size={16} strokeWidth={1.75} /> Gerenciar tags</button>
    </div>
    {visible.length ? <div className="columns-1 gap-4 sm:columns-2 xl:columns-3">{visible.map(idea => { const project = state.projects.find(item => item.id === state.tasks.find(task => task.id === idea.taskId)?.projectId); return <button key={idea.id} type="button" onClick={() => setOpenId(idea.id)} className="group mb-4 block w-full break-inside-avoid rounded-3xl text-left">
      <GlassCard padded={false} className="grid content-start gap-3 overflow-hidden transition group-hover:-translate-y-0.5 group-hover:shadow-lift">
        {idea.image && <img src={idea.image} alt="" className="h-36 w-full object-cover" />}
        <div className="grid gap-2 px-5 pb-5 pt-4">
          <h2 className="text-[17px] font-semibold leading-snug">{idea.title}</h2>
          {idea.description && <p className="line-clamp-3 text-sm text-ink-soft">{idea.description}</p>}
          <div className="flex flex-wrap items-center gap-1.5">{idea.tags.map(tag => <Tag key={tag} tone="ciano">#{tag}</Tag>)}
            {Boolean(idea.links?.length) && <span className="inline-flex items-center gap-1 text-xs font-semibold text-muted"><Link2 size={13} strokeWidth={1.75} />{idea.links!.length}</span>}
            {idea.image && <ImageIcon size={14} strokeWidth={1.75} className="text-muted" aria-label="Com imagem" />}</div>
          {idea.taskId && <p className="flex items-center gap-1 text-xs font-semibold text-magenta">Virou tarefa{project ? ` em ${project.name}` : ''} <ArrowRight size={13} strokeWidth={1.75} /></p>}
        </div>
      </GlassCard>
    </button>; })}</div>
      : <EmptyState icon={Lightbulb} title={showArchived ? 'Nenhuma ideia arquivada' : filter ? `Nenhuma ideia com #${filter}` : 'A geladeira está vazia'}>{showArchived ? 'Ideias arquivadas aparecem aqui.' : 'Escreva no campo acima e aperte Enter. Ideia boa é ideia registrada.'}</EmptyState>}
    <button type="button" onClick={() => setShowArchived(!showArchived)} className="mt-6 min-h-[44px] text-sm font-semibold text-ink-soft hover:text-magenta">{showArchived ? '← Voltar às ideias ativas' : `Ver arquivadas · ${state.ideas.filter(idea => idea.archivedAt).length}`}</button>
    {openId && <IdeaSheet ideaId={openId} onClose={() => setOpenId(null)} />}
    {managing && <TagManager onClose={() => setManaging(false)} />}
  </Page>;
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" onClick={onClick} aria-pressed={active} className={cn('h-11 rounded-full px-4 text-sm font-semibold transition', active ? 'bg-ciano text-violeta shadow-[0_8px_20px_rgba(0,201,223,0.3)]' : 'glass text-ink-soft hover:text-magenta')}>{children}</button>;
}

/** Campo sempre visível: Enter salva. #tags no texto viram tags; o filtro ativo já entra como tag. */
export function QuickCapture({ tag, onSaved, autoFocus }: { tag?: string; onSaved?: () => void; autoFocus?: boolean }) {
  const addIdea = useMive(state => state.addIdea);
  const [text, setText] = useState('');
  const [saved, setSaved] = useState(false);
  const ref = useRef<HTMLInputElement>(null);
  const { title, tags } = parseCapture(text);
  const save = () => {
    if (!title) return;
    addIdea({ title, tags: tag ? [...tags, tag] : tags });
    setText(''); setSaved(true); setTimeout(() => setSaved(false), 1600); ref.current?.focus(); onSaved?.();
  };
  return <form onSubmit={event => { event.preventDefault(); save(); }} className="glass-strong flex items-center gap-2 rounded-3xl p-2 pl-5">
    <Lightbulb size={22} strokeWidth={1.5} className="shrink-0 text-ciano" />
    <label className="sr-only" htmlFor="captura-ideia">Nova ideia</label>
    <input ref={ref} id="captura-ideia" value={text} onChange={event => setText(event.target.value)} autoFocus={autoFocus} placeholder={tag ? `Nova ideia #${tag}` : 'Nova ideia · ex.: Coleção praia #CAVU'} className="h-12 min-w-0 flex-1 bg-transparent text-base font-medium outline-none placeholder:text-muted/70" />
    <span role="status" className={cn('hidden text-sm font-semibold text-magenta transition sm:block', saved ? 'opacity-100' : 'opacity-0')}>Guardada</span>
    <Button type="submit" size="icon" aria-label="Guardar ideia" disabled={!title}><Plus size={20} strokeWidth={2} /></Button>
  </form>;
}
