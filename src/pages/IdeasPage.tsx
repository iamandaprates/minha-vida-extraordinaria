import { Archive, ArchiveRestore, ArrowRightCircle, CheckCircle2, Hash, ImagePlus, Lightbulb, Link2, Trash2, X } from 'lucide-react';
import { useRef, useState } from 'react';
import { ideaCategories } from '../domain/catalog';
import type { Idea, IdeaCategory, IdeaMedia } from '../domain/models';
import { formatDay, normalizeTag } from '../domain/selectors';
import { useLife } from '../state/LifeStore';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Icon } from '../components/icons';
import { resizeImage } from '../components/ProfileMenu';
import { Dialog, EmptyState, Field, PageIntro, Tabs } from '../components/ui';

type View = 'inbox' | 'converted' | 'archived';

/** Geladeira de potencial: capture in seconds, enrich later, then turn into a task or archive. */
export function IdeasPage() {
  const { snapshot, addIdea } = useLife();
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<IdeaCategory>('cavu');
  const [projectId, setProjectId] = useState('');
  const [view, setView] = useState<View>('inbox');
  const [tag, setTag] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const tags = [...new Set(snapshot.ideas.flatMap(idea => idea.tags))].sort();
  const ideas = snapshot.ideas.filter(idea => idea.status === view && (!tag || idea.tags.includes(tag))).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const count = (status: View) => snapshot.ideas.filter(idea => idea.status === status).length;
  const selected = snapshot.ideas.find(idea => idea.id === open);

  return <>
    <PageIntro eyebrow="IDEIAS" title="Geladeira de potencial" text="Ideia boa não some, mas também não vira distração. Capture em segundos, aprofunde quando quiser e decida: vira tarefa física ou vai para o arquivo." />
    <Card tone="soft" className="idea-capture">
      <form onSubmit={event => { event.preventDefault(); if (title.trim()) { const idea = addIdea(title, category, projectId || undefined); setTitle(''); setView('inbox'); setOpen(idea.id); } }}>
        <input value={title} onChange={event => setTitle(event.target.value)} placeholder="Qual é a ideia?" aria-label="Título da ideia" />
        <select value={category} onChange={event => setCategory(event.target.value as IdeaCategory)} aria-label="Categoria">{(Object.keys(ideaCategories) as IdeaCategory[]).map(key => <option key={key} value={key}>{ideaCategories[key].label}</option>)}</select>
        <select value={projectId} onChange={event => setProjectId(event.target.value)} aria-label="Projeto"><option value="">Sem projeto</option>{snapshot.projects.filter(project => project.status === 'active').map(project => <option key={project.id} value={project.id}>{project.title}</option>)}</select>
        <Button variant="primary" type="submit"><Icon as={Lightbulb} size={16} /> Salvar Ideia</Button>
      </form>
    </Card>
    <div className="ideas-toolbar">
      <Tabs label="Situação das ideias" value={view} onChange={setView} options={[{ key: 'inbox', label: `Caixa (${count('inbox')})` }, { key: 'converted', label: `Viraram tarefa (${count('converted')})` }, { key: 'archived', label: `Arquivo (${count('archived')})` }]} />
      {tags.length > 0 && <div className="chip-row"><button type="button" className={`chip ${!tag ? 'selected' : ''}`} aria-pressed={!tag} onClick={() => setTag(null)}>Todas</button>{tags.map(item => <button key={item} type="button" className={`chip ${tag === item ? 'selected' : ''}`} aria-pressed={tag === item} onClick={() => setTag(item)}>#{item}</button>)}</div>}
    </div>
    {ideas.length ? <section className="idea-grid">{ideas.map(idea => <IdeaCard key={idea.id} idea={idea} onOpen={() => setOpen(idea.id)} />)}</section>
      : <Card>{view === 'inbox' ? <EmptyState icon={Lightbulb} title="Espaço livre para a próxima ideia">Quando surgir algo da CAVU, do Café Baiano ou de qualquer lugar, capture em segundos no campo acima.</EmptyState> : view === 'converted' ? <EmptyState icon={ArrowRightCircle} title="Ideia boa vira ação">As ideias que você transformar em tarefa aparecem aqui.</EmptyState> : <EmptyState icon={Archive} title="Arquivo vazio">O que você decidir guardar para depois fica aqui, sem ocupar a sua atenção.</EmptyState>}</Card>}
    {selected && <IdeaDialog idea={selected} onClose={() => setOpen(null)} />}
  </>;
}

export function IdeaCard({ idea, onOpen }: { idea: Idea; onOpen: () => void }) {
  const cover = idea.media.find(item => item.kind === 'image');
  return <Card className="idea-card" role="button" tabIndex={0} onClick={onOpen} onKeyDown={event => { if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); onOpen(); } }} aria-label={`Abrir ideia: ${idea.title}`} style={{ ['--idea-color' as string]: ideaCategories[idea.category].color }}>
    {cover && <img className="idea-cover" src={cover.url} alt="" loading="lazy" decoding="async" />}
    <span className="idea-tag">{ideaCategories[idea.category].label}</span>
    <h3>{idea.title}</h3>
    {idea.description && <p className="idea-desc">{idea.description}</p>}
    {idea.tags.length > 0 && <div className="idea-tags">{idea.tags.map(tag => <span key={tag}>#{tag}</span>)}</div>}
    <small>Capturada {formatDay(idea.createdAt).toLowerCase()}{idea.media.length ? ` · ${idea.media.length} ${idea.media.length === 1 ? 'anexo' : 'anexos'}` : ''}{idea.status === 'converted' ? ' · virou tarefa' : ''}</small>
  </Card>;
}

/** Full idea: long description, links and images, free tags, and the decision. */
export function IdeaDialog({ idea, onClose }: { idea: Idea; onClose: () => void }) {
  const { snapshot, updateIdea, convertIdea, setIdeaStatus } = useLife();
  const [title, setTitle] = useState(idea.title);
  const [description, setDescription] = useState(idea.description ?? '');
  const [tagInput, setTagInput] = useState('');
  const [link, setLink] = useState('');
  const [error, setError] = useState('');
  const file = useRef<HTMLInputElement>(null);
  const task = snapshot.tasks.find(item => item.id === idea.taskId);
  const save = (change: Parameters<typeof updateIdea>[1]) => updateIdea(idea.id, change);
  const addTag = () => { const tag = normalizeTag(tagInput); if (tag && !idea.tags.includes(tag)) save({ tags: [...idea.tags, tag] }); setTagInput(''); };
  const addMedia = (media: IdeaMedia) => save({ media: [...idea.media, media] });
  const addLink = () => { const url = link.trim(); if (!/^https?:\/\//i.test(url)) { setError('Use um link completo, começando com https://'); return; } setError(''); addMedia({ kind: 'link', url, name: url.replace(/^https?:\/\/(www\.)?/, '').split('/')[0] }); setLink(''); };
  const upload = async (picked?: File) => { if (!picked) return; try { addMedia({ kind: 'image', url: await resizeImage(picked, 960, false), name: picked.name }); setError(''); } catch (reason) { setError(reason instanceof Error ? reason.message : 'Falha no upload.'); } };
  const close = () => { if (title.trim() && (title.trim() !== idea.title || description !== (idea.description ?? ''))) save({ title: title.trim(), description }); onClose(); };

  return <Dialog eyebrow={`IDEIA · ${ideaCategories[idea.category].label.toUpperCase()}`} title={idea.title} onClose={close} wide>
    <div className="idea-editor">
      <Field label="Título"><input value={title} onChange={event => setTitle(event.target.value)} onBlur={() => title.trim() && save({ title: title.trim() })} /></Field>
      <Field label="Descrição"><textarea className="idea-long" value={description} onChange={event => setDescription(event.target.value)} onBlur={() => save({ description })} placeholder="Desenvolva a ideia: para quem é, por que agora, como seria a primeira versão, o que você já sabe." /></Field>
      <div className="field-row">
        <Field label="Categoria"><select value={idea.category} onChange={event => save({ category: event.target.value as IdeaCategory })}>{(Object.keys(ideaCategories) as IdeaCategory[]).map(key => <option key={key} value={key}>{ideaCategories[key].label}</option>)}</select></Field>
        <Field label="Projeto"><select value={idea.projectId ?? ''} onChange={event => save({ projectId: event.target.value || undefined })}><option value="">Sem projeto</option>{snapshot.projects.map(project => <option key={project.id} value={project.id}>{project.title}</option>)}</select></Field>
      </div>
      <Field label="Tags"><div className="tag-editor">{idea.tags.map(tag => <span key={tag} className="tag-pill">#{tag}<button type="button" onClick={() => save({ tags: idea.tags.filter(item => item !== tag) })} aria-label={`Remover #${tag}`}><Icon as={X} size={12} /></button></span>)}<input value={tagInput} onChange={event => setTagInput(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' || event.key === ',') { event.preventDefault(); addTag(); } }} onBlur={addTag} placeholder="#Marketing, #Conteúdo..." aria-label="Nova tag" /></div></Field>
      <Field label="Referências">
        <div className="media-list">{idea.media.map((media, index) => <div key={media.url + index} className={`media-item media-${media.kind}`}>
          {media.kind === 'image' ? <img src={media.url} alt={media.name ?? 'Referência'} loading="lazy" decoding="async" /> : <a href={media.url} target="_blank" rel="noreferrer"><Icon as={Link2} size={15} /> {media.name ?? media.url}</a>}
          <button type="button" className="icon-chip" onClick={() => save({ media: idea.media.filter((_, position) => position !== index) })} aria-label="Remover referência"><Icon as={Trash2} size={14} /></button>
        </div>)}</div>
        <div className="inline-add"><input value={link} onChange={event => setLink(event.target.value)} placeholder="Colar link de referência" aria-label="Link de referência" onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); addLink(); } }} /><button type="button" className="icon-chip" onClick={addLink} aria-label="Adicionar link"><Icon as={Hash} size={15} /></button><button type="button" className="icon-chip" onClick={() => file.current?.click()} aria-label="Enviar imagem"><Icon as={ImagePlus} size={15} /></button></div>
        <input ref={file} type="file" accept="image/*" hidden onChange={event => { void upload(event.target.files?.[0]); event.target.value = ''; }} />
        {error && <small className="is-warn">{error}</small>}
      </Field>
    </div>
    <div className="dialog-actions">
      {idea.status === 'inbox' && <><Button variant="primary" onClick={() => { save({ title: title.trim() || idea.title, description }); convertIdea(idea.id); onClose(); }}><Icon as={ArrowRightCircle} size={16} /> Transformar em Tarefa</Button><Button variant="ghost" onClick={() => { setIdeaStatus(idea.id, 'archived'); onClose(); }}><Icon as={Archive} size={16} /> Arquivar</Button></>}
      {idea.status === 'converted' && <span className="idea-done"><Icon as={CheckCircle2} size={16} /> Virou tarefa{task ? `: ${task.title}` : ''}</span>}
      {idea.status === 'archived' && <Button variant="ghost" onClick={() => setIdeaStatus(idea.id, 'inbox')}><Icon as={ArchiveRestore} size={16} /> Voltar para a caixa</Button>}
    </div>
  </Dialog>;
}
