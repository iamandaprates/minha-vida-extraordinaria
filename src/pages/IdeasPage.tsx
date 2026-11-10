import { Archive, ArchiveRestore, ArrowRightCircle, CheckCircle2, Lightbulb } from 'lucide-react';
import { useState } from 'react';
import { ideaCategories } from '../domain/catalog';
import type { IdeaCategory } from '../domain/models';
import { formatDay } from '../domain/selectors';
import { useLife } from '../state/LifeStore';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Icon } from '../components/icons';
import { EmptyState, PageIntro, Tabs } from '../components/ui';

type View = 'inbox' | 'converted' | 'archived';

/** Geladeira de potencial: capture fast, then convert into action or archive. */
export function IdeasPage() {
  const { snapshot, addIdea, convertIdea, setIdeaStatus } = useLife();
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<IdeaCategory>('cavu');
  const [view, setView] = useState<View>('inbox');
  const [filter, setFilter] = useState<IdeaCategory | 'all'>('all');
  const ideas = snapshot.ideas.filter(idea => idea.status === view && (filter === 'all' || idea.category === filter)).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const count = (status: View) => snapshot.ideas.filter(idea => idea.status === status).length;

  return <>
    <PageIntro eyebrow="IDEIAS" title="Geladeira de potencial" text="Ideia boa não some, mas também não vira distração. Capture em segundos e depois decida: vira tarefa física ou vai para o arquivo." />
    <Card tone="soft" className="idea-capture">
      <form onSubmit={event => { event.preventDefault(); if (title.trim()) { addIdea(title, category); setTitle(''); setView('inbox'); } }}>
        <input value={title} onChange={event => setTitle(event.target.value)} placeholder="Qual é a ideia?" aria-label="Título da ideia" />
        <div className="chip-row">{(Object.keys(ideaCategories) as IdeaCategory[]).map(key => <button key={key} type="button" className={`chip ${category === key ? 'selected' : ''}`} onClick={() => setCategory(key)}>{ideaCategories[key].label}</button>)}</div>
        <Button variant="primary" type="submit"><Icon as={Lightbulb} size={16} /> Salvar Ideia</Button>
      </form>
    </Card>
    <div className="ideas-toolbar">
      <Tabs label="Situação das ideias" value={view} onChange={setView} options={[{ key: 'inbox', label: `Caixa (${count('inbox')})` }, { key: 'converted', label: `Viraram tarefa (${count('converted')})` }, { key: 'archived', label: `Arquivo (${count('archived')})` }]} />
      <div className="chip-row">{(['all', ...Object.keys(ideaCategories)] as (IdeaCategory | 'all')[]).map(key => <button key={key} type="button" className={`chip ${filter === key ? 'selected' : ''}`} onClick={() => setFilter(key)}>{key === 'all' ? 'Todas' : ideaCategories[key].label}</button>)}</div>
    </div>
    {ideas.length ? <section className="idea-grid">{ideas.map(idea => {
      const task = snapshot.tasks.find(item => item.id === idea.taskId);
      return <Card key={idea.id} className="idea-card" style={{ ['--idea-color' as string]: ideaCategories[idea.category].color }}>
        <span className="idea-tag">{ideaCategories[idea.category].label}</span>
        <h3>{idea.title}</h3>
        <small>Capturada {formatDay(idea.createdAt).toLowerCase()}</small>
        <div className="idea-actions">
          {idea.status === 'inbox' && <><Button variant="primary" onClick={() => convertIdea(idea.id)}><Icon as={ArrowRightCircle} size={15} /> Transformar em Tarefa</Button><Button variant="ghost" onClick={() => setIdeaStatus(idea.id, 'archived')}><Icon as={Archive} size={15} /> Arquivar</Button></>}
          {idea.status === 'converted' && <span className="idea-done"><Icon as={CheckCircle2} size={15} /> Virou tarefa{task ? `: ${task.title}` : ''}</span>}
          {idea.status === 'archived' && <Button variant="ghost" onClick={() => setIdeaStatus(idea.id, 'inbox')}><Icon as={ArchiveRestore} size={15} /> Voltar para a caixa</Button>}
        </div>
      </Card>;
    })}</section> : <Card><EmptyState icon={Lightbulb}>{view === 'inbox' ? 'Caixa vazia. Quando surgir uma ideia da CAVU, do Café Baiano ou de qualquer coisa, ela cabe aqui.' : 'Nada por aqui ainda.'}</EmptyState></Card>}
  </>;
}
