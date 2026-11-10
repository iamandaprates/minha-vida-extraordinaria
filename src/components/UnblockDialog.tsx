import { ArrowLeft, Battery, Brain, Compass, Headphones, Scissors, ShieldAlert, Zap } from 'lucide-react';
import { useState } from 'react';
import { triggerLabels } from '../domain/catalog';
import { toISODate, type Task, type UnblockTrigger } from '../domain/models';
import { goalOfTask } from '../domain/selectors';
import { useLife } from '../state/LifeStore';
import { Button } from './Button';
import { useFocusTimer } from './FocusTimer';
import { Icon } from './icons';
import { Dialog, Field } from './ui';

/**
 * "Preciso Começar": immediate intervention against inertia. Each trigger ends in a real,
 * small start (a timer running on a concrete action) and leaves an `unblock` fact behind.
 */
const triggers: { key: UnblockTrigger; icon: typeof Zap; hint: string }[] = [
  { key: 'no_start', icon: Compass, hint: 'Três arranques óbvios para escolher.' },
  { key: 'too_big', icon: Scissors, hint: 'Cortar para uma versão rascunho de 20%.' },
  { key: 'perfectionism', icon: ShieldAlert, hint: 'Primeira versão imperfeita em 15 min.' },
  { key: 'distracted', icon: Headphones, hint: 'Ajustar o ambiente e tocar a trilha de foco.' },
  { key: 'low_energy', icon: Battery, hint: 'Micro-timer inegociável de 5 minutos.' },
  { key: 'avoiding', icon: Brain, hint: 'Nomear o desconforto e achar a menor ação física.' }
];
const discomforts = ['Falar com alguém', 'Tomar uma decisão', 'Me expor', 'Tédio', 'Medo do resultado', 'Outro'];
const environment = ['Celular em outro cômodo', 'Só uma aba aberta', 'Água por perto', 'Fone com a trilha de foco'];

export function UnblockDialog({ task, onClose }: { task: Task; onClose: () => void }) {
  const store = useLife();
  const timer = useFocusTimer();
  const [trigger, setTrigger] = useState<UnblockTrigger | null>(null);
  const [draft, setDraft] = useState(`Rascunho 20% · ${task.title}`);
  const [discomfort, setDiscomfort] = useState('');
  const [smallest, setSmallest] = useState('');
  const [checks, setChecks] = useState<string[]>([]);
  const go = (label: string, minutes: number, note?: string, taskId = task.id) => {
    store.logBehavior({ kind: 'unblock', trigger: trigger ?? undefined, taskId: task.id, note });
    timer.start({ kind: 'task', id: taskId, label }, minutes);
    onClose();
  };
  const starts = [`Abrir o material e anotar o primeiro passo de "${task.title}"`, `Fazer só os primeiros 10 minutos de "${task.title}"`, `Escrever em 3 linhas como fica "${task.title}" pronta`];

  return <Dialog eyebrow="PRECISO COMEÇAR" title={trigger ? triggerLabels[trigger] : 'O que está travando agora?'} onClose={onClose} wide>
    {!trigger ? <>
      <p className="dialog-text">Entrega: <b>{task.title}</b>. Escolha o que mais parece com agora. Não existe resposta errada.</p>
      <div className="trigger-grid">{triggers.map(item => <button key={item.key} type="button" className="trigger" onClick={() => setTrigger(item.key)}><Icon as={item.icon} size={20} /><span><b>{triggerLabels[item.key]}</b><small>{item.hint}</small></span></button>)}</div>
    </> : <div className="unblock-step">
      <button type="button" className="back-link" onClick={() => setTrigger(null)}><Icon as={ArrowLeft} size={15} /> Outro motivo</button>
      {trigger === 'no_start' && <>
        <p className="dialog-text">Você não precisa saber o caminho inteiro. Só o primeiro passo. Escolha um:</p>
        <div className="start-options">{starts.map(option => <button key={option} type="button" className="start-option" onClick={() => go(option, 10, option)}><b>{option}</b><small>Começar com 10 minutos →</small></button>)}</div>
      </>}
      {trigger === 'too_big' && <>
        <p className="dialog-text">Corte o escopo. Qual é a versão rascunho, com 20% do esforço, que já conta como avanço?</p>
        <Field label="Versão 20%"><input autoFocus value={draft} onChange={event => setDraft(event.target.value)} /></Field>
        <Button variant="primary" onClick={() => {
          if (!draft.trim()) return;
          const piece = store.addTask({ title: draft, origin: 'planned', projectId: task.projectId, goalId: task.projectId ? undefined : goalOfTask(store.snapshot, task)?.id, areaId: task.areaId, estimateMinutes: 25 });
          const role = task.focusRole ?? 'secondary';
          if (task.focusOn === toISODate(new Date())) store.setFocus(task.id, undefined);
          store.setFocus(piece.id, toISODate(new Date()), role, 25);
          go(piece.title, 25, draft, piece.id);
        }}>Criar versão 20% e começar 25 min →</Button>
        <p className="fine-print">A entrega original volta para o projeto. A versão 20% assume o lugar dela hoje.</p>
      </>}
      {trigger === 'perfectionism' && <>
        <div className="rule-card"><b>Regra da primeira versão imperfeita</b><p>Durante 15 minutos, o objetivo é existir, não ficar bom. Rascunho feio é progresso. A revisão vem depois, com algo na mão.</p></div>
        <Button variant="primary" onClick={() => go(`Primeira versão imperfeita · ${task.title}`, 15, 'primeira versão imperfeita')}>Começar rascunho · 15 min →</Button>
      </>}
      {trigger === 'distracted' && <>
        <p className="dialog-text">Ajuste o ambiente antes de exigir de você. Marque o que já fez:</p>
        <div className="check-list">{environment.map(item => <label key={item} className="toggle"><input type="checkbox" checked={checks.includes(item)} onChange={() => setChecks(current => current.includes(item) ? current.filter(entry => entry !== item) : [...current, item])} /><span>{item}</span></label>)}</div>
        <Button variant="primary" onClick={() => { store.requestFocusMusic(); go(task.title, 25, `ambiente: ${checks.join(', ') || 'nenhum ajuste'}`); }}><Icon as={Headphones} size={16} /> Tocar trilha de foco e começar 25 min</Button>
      </>}
      {trigger === 'low_energy' && <>
        <div className="rule-card"><b>Micro-timer inegociável</b><p>Cinco minutos. Só isso. Quando o timer acabar, você pode parar sem culpa. Na maioria das vezes, começar é o que faltava.</p></div>
        <Button variant="primary" onClick={() => go(task.title, 5, 'micro-timer 5 min')}><Icon as={Zap} size={16} /> Começar 5 minutos agora</Button>
      </>}
      {trigger === 'avoiding' && <>
        <p className="dialog-text">Dê nome ao desconforto. Ele fica menor quando tem nome.</p>
        <div className="chip-row">{discomforts.map(item => <button key={item} type="button" className={`chip ${discomfort === item ? 'selected' : ''}`} onClick={() => setDiscomfort(item)}>{item}</button>)}</div>
        <Field label="Menor ação física possível"><input value={smallest} onChange={event => setSmallest(event.target.value)} placeholder="Ex.: Abrir o WhatsApp do fornecedor e escrever o primeiro parágrafo" /></Field>
        <Button variant="primary" onClick={() => smallest.trim() && go(smallest.trim(), 5, `${discomfort || 'desconforto'} · ${smallest.trim()}`)} disabled={!smallest.trim()}>Fazer agora · 5 min →</Button>
      </>}
    </div>}
  </Dialog>;
}
