import { CalendarPlus, ChevronLeft, ChevronRight, KeyRound, RefreshCw, Sparkles } from 'lucide-react';
import { useState, type CSSProperties } from 'react';
import type { AgendaView } from '../app/navigation';
import { eventSourceLabel } from '../domain/catalog';
import { type CalendarEvent, type LifeSnapshot } from '../domain/models';
import { areaOf, daysBetween, formatTime } from '../domain/selectors';
import { googleClientId, requestGoogleToken } from '../services/googleCalendar';
import { useLife } from '../state/LifeStore';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Icon } from '../components/icons';
import { AreaSelect, Dialog, Field, LinkButton, PageIntro, Tabs } from '../components/ui';

const START_HOUR = 6; const END_HOUR = 24; const HOUR_PX = 52;
const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
const addDays = (date: Date, days: number) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
const mondayOf = (date: Date) => addDays(startOfDay(date), -((date.getDay() + 6) % 7));
const eventsOfDay = (events: CalendarEvent[], day: Date) => events.filter(event => event.status !== 'cancelled' && daysBetween(day, new Date(event.startsAt)) === 0).sort((a, b) => a.startsAt.localeCompare(b.startsAt));

export function AgendaPage({ view, onViewChange }: { view: AgendaView; onViewChange: (view: AgendaView) => void }) {
  const { snapshot } = useLife();
  const [anchor, setAnchor] = useState(startOfDay(new Date()));
  const [creating, setCreating] = useState<string | null>(null);
  const days = view === 'dia' ? [anchor] : Array.from({ length: 7 }, (_, index) => addDays(mondayOf(anchor), index));
  const step = view === 'dia' ? 1 : 7;
  const title = view === 'dia' ? new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }).format(anchor) : `${new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'short' }).format(days[0])} a ${new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'short' }).format(days[6])}`.replace(/\./g, '');
  const now = new Date();
  const free = !days.some(day => eventsOfDay(snapshot.events, day).length);

  return <>
    <PageIntro eyebrow="AGENDA · TIMEBLOCKING" title="Compromissos & rotina" text="Cada bloco tem dono: uma área da vida. Planejar o tempo é o primeiro passo para executar." action={<Button variant="primary" onClick={() => setCreating('')}><Icon as={CalendarPlus} size={16} /> Novo Compromisso</Button>} />
    <GoogleSyncCard />
    <div className="agenda-toolbar">
      <Tabs label="Visualização" value={view} onChange={onViewChange} options={[{ key: 'dia', label: 'Dia' }, { key: 'semana', label: 'Semana' }]} />
      <div className="agenda-nav"><button type="button" className="icon-chip" onClick={() => setAnchor(addDays(anchor, -step))} aria-label="Anterior"><Icon as={ChevronLeft} size={16} /></button><b>{title}</b><button type="button" className="icon-chip" onClick={() => setAnchor(addDays(anchor, step))} aria-label="Próximo"><Icon as={ChevronRight} size={16} /></button><Button variant="ghost" onClick={() => setAnchor(startOfDay(new Date()))}>Hoje</Button></div>
    </div>
    {free && <p className="agenda-empty"><Icon as={Sparkles} size={18} /><span><b>Vamos executar?</b> {view === 'dia' ? 'Este dia está livre' : 'Esta semana está livre'}. Dê dono ao seu tempo: comece pelo bloco da sua Prioridade Magna.</span><LinkButton onClick={() => setCreating('')}>Criar o primeiro bloco →</LinkButton></p>}
    <Card className={`timegrid timegrid-${view}`}>
      <div className="timegrid-head" style={{ '--cols': days.length } as CSSProperties}><span />{days.map(day => <span key={day.toISOString()} className={daysBetween(now, day) === 0 ? 'is-today' : ''}>{new Intl.DateTimeFormat('pt-BR', { weekday: 'short' }).format(day).replace('.', '')}<b>{day.getDate()}</b></span>)}</div>
      <div className="timegrid-body" style={{ '--cols': days.length, height: (END_HOUR - START_HOUR) * HOUR_PX } as CSSProperties}>
        <div className="timegrid-hours">{Array.from({ length: END_HOUR - START_HOUR }, (_, index) => <span key={index} style={{ top: index * HOUR_PX }}>{String(START_HOUR + index).padStart(2, '0')}:00</span>)}</div>
        {days.map(day => <DayColumn key={day.toISOString()} day={day} snapshot={snapshot} now={now} onCreate={hour => setCreating(`${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}T${String(hour).padStart(2, '0')}:00`)} />)}
      </div>
    </Card>
    {creating !== null && <EventDialog initial={creating} onClose={() => setCreating(null)} />}
  </>;
}

function DayColumn({ day, snapshot, now, onCreate }: { day: Date; snapshot: LifeSnapshot; now: Date; onCreate: (hour: number) => void }) {
  const events = eventsOfDay(snapshot.events, day);
  const today = daysBetween(now, day) === 0;
  const nowTop = ((now.getHours() + now.getMinutes() / 60) - START_HOUR) * HOUR_PX;
  return <div className="timegrid-col" onDoubleClick={event => { const rect = (event.currentTarget as HTMLElement).getBoundingClientRect(); onCreate(Math.min(END_HOUR - 1, START_HOUR + Math.floor((event.clientY - rect.top) / HOUR_PX))); }}>
    {Array.from({ length: END_HOUR - START_HOUR }, (_, index) => <i key={index} className="hour-line" style={{ top: index * HOUR_PX }} />)}
    {today && nowTop > 0 && <i className="now-line" style={{ top: nowTop }} />}
    {events.map(event => {
      const start = new Date(event.startsAt); const end = new Date(event.endsAt);
      const top = Math.max(0, ((start.getHours() + start.getMinutes() / 60) - START_HOUR) * HOUR_PX);
      const height = Math.max(26, ((end.getTime() - start.getTime()) / 3_600_000) * HOUR_PX - 3);
      const area = areaOf(snapshot, event.areaId);
      return <div key={event.id} className={`time-block ${event.source === 'google' ? 'is-google' : ''}`} style={{ top, height, '--block-color': area?.color ?? 'var(--violet)' } as CSSProperties} title={`${event.title} · ${formatTime(event.startsAt)}`}>
        <b>{event.title}</b><small>{formatTime(event.startsAt)} a {formatTime(event.endsAt)} · {area?.name ?? eventSourceLabel[event.source]}</small>
      </div>;
    })}
  </div>;
}

export function EventDialog({ initial, onClose }: { initial: string; onClose: () => void }) {
  const { snapshot, addEvent } = useLife();
  const [title, setTitle] = useState(''); const [areaId, setAreaId] = useState(''); const [when, setWhen] = useState(initial); const [minutes, setMinutes] = useState(60);
  const submit = () => { if (!title.trim() || !when) return; const start = new Date(when); addEvent({ title, areaId: areaId || undefined, startsAt: start.toISOString(), endsAt: new Date(start.getTime() + minutes * 60_000).toISOString() }); onClose(); };
  return <Dialog eyebrow="NOVO COMPROMISSO" title="Qual bloco entra na agenda?" onClose={onClose} onSubmit={submit} submitLabel="Criar compromisso">
    <Field label="Título"><input autoFocus value={title} onChange={event => setTitle(event.target.value)} placeholder="Ex.: Treino · pernas" /></Field>
    <div className="field-row"><Field label="Horário"><input type="datetime-local" required value={when} onChange={event => setWhen(event.target.value)} /></Field><Field label="Duração"><select value={minutes} onChange={event => setMinutes(Number(event.target.value))}>{[30, 50, 60, 90, 120, 180].map(value => <option key={value} value={value}>{value < 60 || value % 60 ? `${value} min` : `${value / 60} h`}</option>)}</select></Field></div>
    <Field label="Área da vida"><AreaSelect areas={snapshot.areas} value={areaId} onChange={setAreaId} /></Field>
  </Dialog>;
}

/** Google Calendar: OAuth when a client id is configured, or a pasted access token. */
function GoogleSyncCard() {
  const { calendarSync, syncGoogleCalendar } = useLife();
  const [token, setToken] = useState('');
  const [manual, setManual] = useState(false);
  const clientId = googleClientId();
  const connect = async () => { if (!clientId) { setManual(true); return; } try { await syncGoogleCalendar(await requestGoogleToken(clientId)); } catch (error) { console.error(error); } };
  const status = calendarSync.status === 'syncing' ? 'Sincronizando…' : calendarSync.status === 'synced' ? `${calendarSync.imported ?? 0} compromissos lidos ${calendarSync.lastSyncAt ? `às ${formatTime(calendarSync.lastSyncAt)}` : ''}` : calendarSync.status === 'error' ? calendarSync.message : clientId ? 'Pronto para conectar.' : 'Defina VITE_GOOGLE_CLIENT_ID para conectar com um clique, ou cole um token OAuth.';
  return <Card tone="soft" className={`integration-note ${calendarSync.status === 'error' ? 'is-error' : ''}`}>
    <span className="integration-icon"><Icon as={RefreshCw} size={18} className={calendarSync.status === 'syncing' ? 'spin' : ''} /></span>
    <div><b>Google Calendar</b><p>{status}</p>
      {manual && <form className="inline-add" onSubmit={event => { event.preventDefault(); if (token.trim()) { void syncGoogleCalendar(token.trim()); setToken(''); } }}><input type="password" value={token} onChange={event => setToken(event.target.value)} placeholder="Token OAuth com escopo calendar.readonly" aria-label="Token OAuth do Google" autoComplete="off" /><button type="submit" className="icon-chip" aria-label="Sincronizar com token"><Icon as={KeyRound} size={15} /></button></form>}
    </div>
    <Button variant="primary" onClick={() => void connect()} disabled={calendarSync.status === 'syncing'}>{calendarSync.status === 'synced' ? 'Sincronizar de novo' : 'Conectar'}</Button>
  </Card>;
}
