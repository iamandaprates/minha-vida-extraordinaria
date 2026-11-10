import { Award, Crown, Heart, Pencil, Plus, Star } from 'lucide-react';
import { useState } from 'react';
import { toISODate, type IdentityProfile } from '../domain/models';
import { formatDay } from '../domain/selectors';
import { useLife, type IdentityDraft } from '../state/LifeStore';
import { Button } from './Button';
import { Icon } from './icons';
import { Drawer, EmptyState, Field } from './ui';

const latest = (profiles: IdentityProfile[]) => profiles.slice().sort((a, b) => a.savedAt.localeCompare(b.savedAt)).at(-1);
const lines = (value: string) => value.split('\n').map(item => item.trim()).filter(Boolean);

/** "Eu Sou": MAVI declarations, SER · FAZER · TER, references and the evidence bank. */
export function IdentityDrawer({ onClose }: { onClose: () => void }) {
  const { snapshot, saveIdentity, addEvidence } = useLife();
  const profile = latest(snapshot.identityProfiles);
  const [editing, setEditing] = useState(false);
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const evidences = snapshot.evidences.slice().sort((a, b) => (b.date ?? b.createdAt).localeCompare(a.date ?? a.createdAt));

  return <Drawer eyebrow="EU SOU" title="Quem eu sou, por escolha" onClose={onClose}>
    {editing ? <IdentityEditor profile={profile} onCancel={() => setEditing(false)} onSave={draft => { saveIdentity(draft); setEditing(false); }} /> : <>
      <section className="identity-block">
        <div className="identity-head"><span className="label">DECLARAÇÕES MAVI</span><button type="button" className="icon-chip" onClick={() => setEditing(true)} aria-label="Editar identidade"><Icon as={Pencil} size={15} /></button></div>
        <ul className="declarations">{(profile?.declarations ?? []).map(item => <li key={item}><span>Eu sou</span> {item.toLocaleLowerCase('pt-BR')}</li>)}</ul>
      </section>
      <section className="identity-block">
        <span className="label">MATRIZ SER · FAZER · TER</span>
        <div className="sft">{(['ser', 'fazer', 'ter'] as const).map(key => <div key={key} className={`sft-col sft-${key}`}><b>{key.toUpperCase()}</b><ul>{(profile?.serFazerTer[key] ?? []).map(item => <li key={item}>{item}</li>)}</ul></div>)}</div>
      </section>
      <section className="identity-block">
        <span className="label">REFERÊNCIAS</span>
        <div className="references">{(profile?.references ?? []).map(reference => <span key={reference.name} className="reference"><Icon as={reference.relation ? Heart : Star} size={14} />{reference.name}{reference.relation && <small>{reference.relation}</small>}</span>)}</div>
      </section>
      <section className="identity-block">
        <div className="identity-head"><span className="label">BANCO DE EVIDÊNCIAS</span><Button variant="ghost" onClick={() => setEvidenceOpen(!evidenceOpen)}><Icon as={Plus} size={15} /> Evidência</Button></div>
        {evidenceOpen && <EvidenceForm onSave={(title, date, note) => { addEvidence({ title, date, note }); setEvidenceOpen(false); }} />}
        {evidences.length ? <ul className="evidence-list">{evidences.map(item => <li key={item.id}><Icon as={Award} size={16} /><div><b>{item.title}</b><small>{item.date ? formatDay(item.date) : 'Sem data'}{item.note ? ` · ${item.note}` : ''}</small></div></li>)}</ul>
          : <EmptyState icon={Crown}>Registre as vitórias que você já viveu. Nos dias de dúvida, elas lembram do que você é capaz.</EmptyState>}
      </section>
      {profile && <p className="fine-print">Versão de {new Date(profile.savedAt).toLocaleDateString('pt-BR')}. Cada edição cria uma nova versão e preserva as anteriores.</p>}
    </>}
  </Drawer>;
}

function EvidenceForm({ onSave }: { onSave: (title: string, date?: string, note?: string) => void }) {
  const [title, setTitle] = useState(''); const [date, setDate] = useState(toISODate(new Date())); const [note, setNote] = useState('');
  return <form className="evidence-form" onSubmit={event => { event.preventDefault(); if (title.trim()) onSave(title, date || undefined, note.trim() || undefined); }}>
    <Field label="Conquista"><input autoFocus value={title} onChange={event => setTitle(event.target.value)} placeholder="Ex.: Fechei meu primeiro contrato" /></Field>
    <div className="field-row"><Field label="Quando"><input type="date" value={date} onChange={event => setDate(event.target.value)} /></Field><Field label="Detalhe"><input value={note} onChange={event => setNote(event.target.value)} placeholder="Opcional" /></Field></div>
    <Button variant="primary" type="submit">Guardar evidência</Button>
  </form>;
}

function IdentityEditor({ profile, onSave, onCancel }: { profile?: IdentityProfile; onSave: (draft: IdentityDraft) => void; onCancel: () => void }) {
  const [declarations, setDeclarations] = useState((profile?.declarations ?? []).join('\n'));
  const [ser, setSer] = useState((profile?.serFazerTer.ser ?? []).join('\n'));
  const [fazer, setFazer] = useState((profile?.serFazerTer.fazer ?? []).join('\n'));
  const [ter, setTer] = useState((profile?.serFazerTer.ter ?? []).join('\n'));
  const [references, setReferences] = useState((profile?.references ?? []).map(item => item.relation ? `${item.name} / ${item.relation}` : item.name).join('\n'));
  const save = () => onSave({ declarations: lines(declarations), serFazerTer: { ser: lines(ser), fazer: lines(fazer), ter: lines(ter) }, references: lines(references).map(item => { const [name, relation] = item.split('/').map(part => part.trim()); return { name, relation: relation || undefined }; }) });
  return <div className="identity-editor">
    <Field label="Declarações (uma por linha)"><textarea value={declarations} onChange={event => setDeclarations(event.target.value)} /></Field>
    <Field label="SER"><textarea value={ser} onChange={event => setSer(event.target.value)} /></Field>
    <Field label="FAZER"><textarea value={fazer} onChange={event => setFazer(event.target.value)} /></Field>
    <Field label="TER"><textarea value={ter} onChange={event => setTer(event.target.value)} /></Field>
    <Field label="Referências (nome / relação)"><textarea value={references} onChange={event => setReferences(event.target.value)} /></Field>
    <div className="dialog-actions"><Button variant="primary" onClick={save}>Salvar nova versão</Button><Button variant="ghost" onClick={onCancel}>Cancelar</Button></div>
  </div>;
}
