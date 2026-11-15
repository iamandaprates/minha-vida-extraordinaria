import { CalendarCheck, Plus, Settings2 } from 'lucide-react';
import { useState } from 'react';
import { toISODate, type AestheticRitual } from '../domain/models';
import { formatAgo, formatDay, ritualStatuses } from '../domain/selectors';
import { useLife } from '../state/LifeStore';
import { Button } from './Button';
import { Card } from './Card';
import { Icon, iconByName } from './icons';
import { Dialog, EmptyState, Field, SectionHeading, Tag } from './ui';

/** Bem-estar & Imagem: beauty and maintenance rituals with return intervals. */
export function WellbeingPanel() {
  const { snapshot } = useLife();
  const [record, setRecord] = useState<AestheticRitual | null>(null);
  const [edit, setEdit] = useState<AestheticRitual | 'new' | null>(null);
  const statuses = ritualStatuses(snapshot);
  return <>
    <SectionHeading label="BEM-ESTAR & IMAGEM" title="Rituais de cuidado" action={<Button onClick={() => setEdit('new')}><Icon as={Plus} size={16} /> Ritual</Button>} />
    {statuses.length ? <section className="marker-grid">{statuses.map(({ ritual, last, next, daysLeft, due }) => <Card key={ritual.id} className={`marker-card ritual-card ${due ? 'is-due' : ''}`}>
      <div className="ritual-top"><span className="marker-icon ritual-icon"><Icon as={iconByName(ritual.icon)} size={20} /></span><button type="button" className="icon-chip" onClick={() => setEdit(ritual)} aria-label={`Ajustar ${ritual.name}`}><Icon as={Settings2} size={15} /></button></div>
      <span className="label">{ritual.name.toUpperCase()}</span>
      <h3>{last ? formatDay(last) : 'Sem registro'}</h3>
      <p>{last ? `Foi ${formatAgo(last)} · retorno a cada ${ritual.intervalDays} dias.` : `Retorno a cada ${ritual.intervalDays} dias. Registre a última vez.`}</p>
      {next && <Tag tone={due ? 'building' : 'flow'}>{due ? 'Hora de agendar' : `Próximo em ${daysLeft} ${daysLeft === 1 ? 'dia' : 'dias'}`}</Tag>}
      <Button onClick={() => setRecord(ritual)}><Icon as={CalendarCheck} size={15} /> Registrar data</Button>
    </Card>)}</section> : <Card><EmptyState title="Seu cuidado merece um ritmo">Cadastre um ritual (cabelo, unhas, pele) e a Mive lembra quando é hora de voltar.</EmptyState></Card>}
    <p className="fine-print">O dossiê de imagem (cartela, silhueta e arquétipo) fica na gaveta Eu Sou.</p>
    {record && <RecordDialog ritual={record} onClose={() => setRecord(null)} />}
    {edit && <RitualDialog ritual={edit === 'new' ? undefined : edit} onClose={() => setEdit(null)} />}
  </>;
}

function RecordDialog({ ritual, onClose }: { ritual: AestheticRitual; onClose: () => void }) {
  const { recordAesthetic } = useLife();
  const [date, setDate] = useState(toISODate(new Date())); const [note, setNote] = useState('');
  return <Dialog eyebrow="RITUAL DE CUIDADO" title={ritual.name} onClose={onClose} onSubmit={() => { if (date) { recordAesthetic(ritual.id, date, note); onClose(); } }} submitLabel="Registrar">
    <Field label="Quando aconteceu"><input type="date" value={date} max={toISODate(new Date())} onChange={event => setDate(event.target.value)} /></Field>
    <Field label="Observação"><input value={note} onChange={event => setNote(event.target.value)} placeholder="Ex.: corte e hidratação, profissional" /></Field>
  </Dialog>;
}

function RitualDialog({ ritual, onClose }: { ritual?: AestheticRitual; onClose: () => void }) {
  const { addRitual, updateRitual } = useLife();
  const [name, setName] = useState(ritual?.name ?? ''); const [days, setDays] = useState(String(ritual?.intervalDays ?? 30));
  return <Dialog eyebrow={ritual ? 'AJUSTAR RITUAL' : 'NOVO RITUAL'} title={ritual ? ritual.name : 'Qual cuidado vamos acompanhar?'} onClose={onClose} onSubmit={() => { const interval = Number(days); if (!name.trim() || !(interval > 0)) return; if (ritual) updateRitual(ritual.id, { name: name.trim(), intervalDays: interval }); else addRitual(name, interval); onClose(); }}>
    <Field label="Nome"><input autoFocus value={name} onChange={event => setName(event.target.value)} placeholder="Ex.: Sobrancelha" /></Field>
    <Field label="Retorno a cada (dias)"><input type="number" min={1} value={days} onChange={event => setDays(event.target.value)} /></Field>
  </Dialog>;
}
