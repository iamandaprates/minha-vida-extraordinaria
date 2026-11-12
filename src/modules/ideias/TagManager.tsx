import { Check, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useMive } from '../../store/useMive';
import { Button, Modal } from '../../ui';

/** Gerenciador de tags: criar, renomear (atualiza ideias e projetos) e remover. */
export function TagManager({ onClose }: { onClose: () => void }) {
  const state = useMive();
  const [draft, setDraft] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [rename, setRename] = useState('');
  const count = (tag: string) => state.ideas.filter(idea => idea.tags.includes(tag)).length;
  return <Modal open onClose={onClose} title="Tags das ideias" eyebrow="Ideias">
    <div className="grid gap-4">
      <ul className="grid gap-1">{state.ideaTags.map(tag => <li key={tag} className="flex items-center gap-2 rounded-2xl px-2 py-1 hover:bg-rosa/50 dark:hover:bg-white/5">
        {editing === tag ? <form className="flex flex-1 gap-2" onSubmit={event => { event.preventDefault(); state.renameIdeaTag(tag, rename); setEditing(null); }}>
          <label className="sr-only" htmlFor="renomear-tag">Novo nome da tag</label>
          <input id="renomear-tag" value={rename} onChange={event => setRename(event.target.value)} autoFocus className="h-11 min-w-0 flex-1 rounded-2xl border border-line/15 bg-white/80 px-3 text-sm font-medium dark:bg-white/5" />
          <Button type="submit" size="icon" aria-label="Salvar nome"><Check size={17} strokeWidth={2} /></Button>
        </form> : <>
          <span className="flex-1 font-semibold text-[#007e8c] dark:text-ciano">#{tag}</span><span className="text-xs font-medium text-muted">{count(tag)} {count(tag) === 1 ? 'ideia' : 'ideias'}</span>
          <button type="button" onClick={() => { setEditing(tag); setRename(tag); }} aria-label={`Renomear #${tag}`} className="grid h-11 w-11 place-items-center rounded-full text-muted hover:text-magenta"><Pencil size={15} strokeWidth={1.75} /></button>
          <button type="button" onClick={() => state.removeIdeaTag(tag)} aria-label={`Remover #${tag}`} className="grid h-11 w-11 place-items-center rounded-full text-muted hover:text-magenta"><Trash2 size={15} strokeWidth={1.75} /></button>
        </>}
      </li>)}</ul>
      <form className="flex gap-2" onSubmit={event => { event.preventDefault(); state.addIdeaTag(draft); setDraft(''); }}>
        <label className="sr-only" htmlFor="criar-tag">Nova tag</label>
        <input id="criar-tag" value={draft} onChange={event => setDraft(event.target.value)} placeholder="#nova-tag" className="h-11 min-w-0 flex-1 rounded-2xl border border-line/15 bg-white/80 px-4 text-sm font-medium dark:bg-white/5" />
        <Button type="submit" variant="secondary" size="icon" aria-label="Criar tag" disabled={!draft.trim()}><Plus size={18} strokeWidth={2} /></Button>
      </form>
      <p className="text-xs text-muted">Renomear a tag atualiza as ideias e o projeto que usa a mesma tag. Remover tira a tag das ideias, sem apagar nenhuma.</p>
    </div>
  </Modal>;
}
