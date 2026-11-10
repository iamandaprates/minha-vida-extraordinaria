import { ArrowLeft, Battery, Brain, Compass, Headphones, Scissors, ShieldAlert, Zap, type LucideIcon } from 'lucide-react';
import { useState } from 'react';
import { deliveriesOf, isOpen } from '../../lib/selectors';
import { useFocus } from '../../store/useFocus';
import { useMive } from '../../store/useMive';
import { useUi } from '../../store/useUi';
import { Button, Input, Modal } from '../../ui';

type Trigger = 'sem_inicio' | 'grande_demais' | 'perfeccionismo' | 'distraida' | 'sem_energia' | 'evitando';
const triggers: { key: Trigger; label: string; hint: string; icon: LucideIcon }[] = [
  { key: 'sem_inicio', label: 'Não sei por onde começar', hint: '3 opções óbvias de primeiro passo.', icon: Compass },
  { key: 'grande_demais', label: 'A tarefa parece grande demais', hint: 'Faça só os primeiros 20%.', icon: Scissors },
  { key: 'perfeccionismo', label: 'Medo de errar / perfeccionismo', hint: 'Versão imperfeita em 15 min.', icon: ShieldAlert },
  { key: 'distraida', label: 'Distraída / sem foco', hint: 'Ambiente pronto e trilha de foco.', icon: Headphones },
  { key: 'sem_energia', label: 'Sem vontade / energia baixa', hint: 'Micro-timer inegociável de 5 min.', icon: Battery },
  { key: 'evitando', label: 'Evitando desconforto', hint: 'A menor ação física possível.', icon: Brain }
];
const environment = ['Celular longe, de preferência em outro cômodo', 'Água por perto', 'Só uma aba aberta', 'Fone com a trilha de foco'];

/** "Preciso Começar": 6 intervenções que terminam num começo real, com o timer rodando. */
export function Unblock({ open, onClose }: { open: boolean; onClose: () => void }) {
  const state = useMive();
  const focus = useFocus();
  const openSpotify = useUi(ui => ui.setSpotifyOpen);
  const options = [...deliveriesOf(state).all, ...state.tasks.filter(task => isOpen(task) && !task.plannedFor)].filter(isOpen);
  const [trigger, setTrigger] = useState<Trigger | null>(null);
  const [taskId, setTaskId] = useState('');
  const task = options.find(item => item.id === taskId) ?? options[0];
  const [steps, setSteps] = useState<string[]>([]);
  const [draft, setDraft] = useState('');
  const [smallest, setSmallest] = useState('');
  const [checks, setChecks] = useState<string[]>([]);
  const reset = () => { setTrigger(null); setSteps([]); setDraft(''); setSmallest(''); setChecks([]); };
  const close = () => { reset(); onClose(); };
  const go = (label: string, minutes: number, linked = task?.id) => { state.logBehavior('unblock_used', { taskId: task?.id, meta: { trigger: trigger ?? '' } }); focus.start(label, minutes, linked); close(); };
  const pick = (next: Trigger) => { setTrigger(next); if (task) { setSteps([`Abrir o material de "${task.title}" e anotar o primeiro passo`, `Fazer só os primeiros 10 minutos de "${task.title}"`, `Escrever em 3 linhas como "${task.title}" fica pronta`]); setDraft(`Rascunho 20% · ${task.title}`); } };

  return <Modal open={open} onClose={close} title={trigger ? triggers.find(item => item.key === trigger)!.label : 'O que está travando agora?'} eyebrow="Preciso começar" className="max-w-2xl">
    {!task ? <p className="text-ink-soft">Escolha uma entrega para hoje primeiro. Depois, se travar, a Mive te ajuda a começar.</p> : !trigger ? <>
      <label className="mb-4 grid gap-2"><span className="text-sm font-semibold">Entrega</span><select value={task.id} onChange={event => setTaskId(event.target.value)} className="h-12 rounded-2xl border border-line/15 bg-white/80 px-3 font-medium dark:bg-white/5">{options.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
      <div className="grid gap-3 sm:grid-cols-2">{triggers.map(item => <button key={item.key} type="button" onClick={() => pick(item.key)} className="flex min-h-[72px] items-start gap-3 rounded-3xl border border-line/10 p-4 text-left transition hover:-translate-y-0.5 hover:border-magenta/40">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-rosa text-magenta dark:bg-magenta/15"><item.icon size={20} strokeWidth={1.75} /></span>
        <span><span className="block font-semibold">{item.label}</span><span className="mt-0.5 block text-sm text-muted">{item.hint}</span></span>
      </button>)}</div>
    </> : <div className="grid gap-4">
      <button type="button" onClick={() => setTrigger(null)} className="inline-flex items-center gap-2 justify-self-start text-sm font-semibold text-magenta"><ArrowLeft size={16} strokeWidth={1.75} /> Outro motivo</button>
      {trigger === 'sem_inicio' && <>
        <p className="text-ink-soft">Você não precisa saber o caminho todo. Só o primeiro passo. Ajuste se quiser e escolha um:</p>
        {steps.map((step, index) => <div key={index} className="grid gap-2 rounded-3xl border border-line/10 p-3 sm:grid-cols-[1fr_auto] sm:items-center">
          <input aria-label={`Opção ${index + 1}`} value={step} onChange={event => setSteps(current => current.map((item, position) => position === index ? event.target.value : item))} className="h-11 rounded-2xl border border-line/15 bg-white/80 px-3 font-medium dark:bg-white/5" />
          <Button size="sm" onClick={() => step.trim() && go(step.trim(), 10)}>Começar · 10 min</Button>
        </div>)}
      </>}
      {trigger === 'grande_demais' && <>
        <p className="text-ink-soft">Corte o escopo. Qual é o rascunho com 20% do esforço que já conta como avanço?</p>
        <Input label="Versão rascunho" value={draft} onChange={event => setDraft(event.target.value)} />
        <Button className="justify-self-start" onClick={() => {
          if (!draft.trim()) return;
          const piece = state.addTask({ title: draft.trim(), projectId: task.projectId, estimateMin: 25 });
          if (task.plannedFor) { const role = task.role ?? 'secundaria'; state.unplanDelivery(task.id); state.planDelivery(piece.id, role); }
          go(piece.title, 25, piece.id);
        }}>Criar rascunho e começar 25 min</Button>
        <p className="text-sm text-muted">A entrega original volta para o projeto. O rascunho ocupa o lugar dela hoje.</p>
      </>}
      {trigger === 'perfeccionismo' && <>
        <div className="rounded-3xl bg-rosa/70 p-4 dark:bg-magenta/10"><p className="font-semibold">Regra da versão imperfeita</p><p className="mt-1 text-ink-soft">Nos próximos 15 minutos o objetivo é existir, não ficar bom. Rascunho feio é progresso; a revisão vem depois, com algo na mão.</p></div>
        <Button className="justify-self-start" onClick={() => go(`Versão imperfeita · ${task.title}`, 15)}>Começar sprint de 15 min</Button>
      </>}
      {trigger === 'distraida' && <>
        <p className="text-ink-soft">Ajuste o ambiente antes de cobrar de você:</p>
        <div className="grid gap-2">{environment.map(item => <label key={item} className="flex min-h-[44px] items-center gap-3 rounded-2xl border border-line/10 px-4 font-medium"><input type="checkbox" className="h-5 w-5 accent-magenta" checked={checks.includes(item)} onChange={() => setChecks(current => current.includes(item) ? current.filter(entry => entry !== item) : [...current, item])} />{item}</label>)}</div>
        <Button className="justify-self-start" onClick={() => { openSpotify(true); go(task.title, 25); }}><Headphones size={18} strokeWidth={1.75} /> Abrir playlist e começar 25 min</Button>
      </>}
      {trigger === 'sem_energia' && <>
        <div className="rounded-3xl bg-rosa/70 p-4 dark:bg-magenta/10"><p className="font-semibold">5 minutos inegociáveis</p><p className="mt-1 text-ink-soft">Só cinco. Quando acabar, você pode parar sem culpa. Na maioria das vezes, começar era o que faltava.</p></div>
        <Button className="justify-self-start" onClick={() => go(task.title, 5)}><Zap size={18} strokeWidth={1.75} /> Começar 5 min agora</Button>
      </>}
      {trigger === 'evitando' && <>
        <Input label="Qual a menor ação física possível?" value={smallest} onChange={event => setSmallest(event.target.value)} placeholder="Ex.: Abrir o WhatsApp do fornecedor e escrever 'Oi'" />
        <Button className="justify-self-start" disabled={!smallest.trim()} onClick={() => go(smallest.trim(), 5)}>Fazer agora · 5 min</Button>
      </>}
    </div>}
  </Modal>;
}
