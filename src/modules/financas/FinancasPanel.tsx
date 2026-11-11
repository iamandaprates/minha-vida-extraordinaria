import { addMonths, format } from 'date-fns';
import { ArrowDownRight, ArrowUpRight, ChevronLeft, ChevronRight, Gem, Pencil, Plus, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { formatDay, fromISODate, todayISO } from '../../lib/dates';
import { formatBRL, parseBRL } from '../../lib/money';
import { vaultSaved } from '../../lib/selectors';
import { useMive } from '../../store/useMive';
import type { TransactionKind, Vault } from '../../types';
import { Button, GlassCard, Input, Modal, Select, Tabs, Tag, cn } from '../../ui';

/** Livro-caixa 100% manual, com filtro por mês e os cofres patrimoniais. */
export function FinancasPanel() {
  const state = useMive();
  const [month, setMonth] = useState(todayISO().slice(0, 7));
  const [creating, setCreating] = useState(false);
  const monthDate = fromISODate(`${month}-01`);
  const shift = (step: number) => setMonth(format(addMonths(monthDate, step), 'yyyy-MM'));
  const signed = (kind: TransactionKind, cents: number) => kind === 'receita' ? cents : -cents;
  const balance = state.transactions.reduce((sum, item) => sum + signed(item.kind, item.amountCents), 0);
  const inMonth = state.transactions.filter(item => item.date.startsWith(month)).sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
  const income = inMonth.filter(item => item.kind === 'receita').reduce((sum, item) => sum + item.amountCents, 0);
  const expense = inMonth.filter(item => item.kind === 'despesa').reduce((sum, item) => sum + item.amountCents, 0);

  return <div className="grid gap-5">
    <div className="grid gap-4 sm:grid-cols-3">
      <GlassCard tone="strong" className="sm:col-span-1"><p className="eyebrow">Saldo líquido</p><p className="mt-2 text-[32px] font-bold tabular-nums leading-none">{formatBRL(balance)}</p><p className="mt-2 text-sm text-muted">Soma de tudo que entrou menos tudo que saiu.</p></GlassCard>
      <GlassCard><p className="eyebrow">Entradas no mês</p><p className="mt-2 flex items-center gap-2 text-2xl font-bold tabular-nums"><ArrowUpRight size={22} strokeWidth={1.75} className="text-magenta" />{formatBRL(income)}</p></GlassCard>
      <GlassCard><p className="eyebrow">Saídas no mês</p><p className="mt-2 flex items-center gap-2 text-2xl font-bold tabular-nums"><ArrowDownRight size={22} strokeWidth={1.75} className="text-violeta dark:text-lilas" />{formatBRL(expense)}</p></GlassCard>
    </div>

    <GlassCard className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Livro-caixa</h2>
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => shift(-1)} aria-label="Mês anterior" className="grid h-11 w-11 place-items-center rounded-full hover:text-magenta"><ChevronLeft size={20} strokeWidth={1.75} /></button>
          <span className="min-w-[130px] text-center text-sm font-semibold first-letter:uppercase">{formatDay(monthDate, "MMMM 'de' yyyy")}</span>
          <button type="button" onClick={() => shift(1)} aria-label="Próximo mês" className="grid h-11 w-11 place-items-center rounded-full hover:text-magenta"><ChevronRight size={20} strokeWidth={1.75} /></button>
        </div>
        <Button onClick={() => setCreating(true)}><Plus size={18} strokeWidth={2} /> Nova Transação</Button>
      </div>
      <ul className="grid gap-1">{inMonth.map(item => { const vault = state.vaults.find(entry => entry.id === item.vaultId); return <li key={item.id} className="flex items-center gap-3 rounded-2xl px-2 py-2 hover:bg-rosa/50 dark:hover:bg-white/5">
        <span className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-xl', item.kind === 'receita' ? 'bg-magenta/10 text-magenta' : 'bg-lilas/25 text-violeta dark:text-lilas')}>{item.kind === 'receita' ? <ArrowUpRight size={18} strokeWidth={1.75} /> : <ArrowDownRight size={18} strokeWidth={1.75} />}</span>
        <div className="min-w-0 flex-1"><p className="truncate text-[15px] font-semibold">{item.category}</p><p className="truncate text-xs text-muted">{formatDay(item.date, "d 'de' MMM")}{item.destination && ` · ${item.destination}`}{vault && ` · aporte em ${vault.name}`}</p></div>
        <span className={cn('shrink-0 text-[15px] font-bold tabular-nums', item.kind === 'receita' && 'text-magenta')}>{item.kind === 'receita' ? '+' : '−'} {formatBRL(item.amountCents)}</span>
        <button type="button" onClick={() => state.deleteTransaction(item.id)} aria-label={`Excluir transação ${item.category}`} className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-muted hover:text-magenta"><Trash2 size={16} strokeWidth={1.75} /></button>
      </li>; })}</ul>
      {!inMonth.length && <p className="rounded-2xl bg-rosa/60 px-4 py-6 text-center text-sm text-ink-soft dark:bg-white/5">Nenhum lançamento neste mês. Registrar é o primeiro passo do controle.</p>}
    </GlassCard>

    <section aria-labelledby="cofres" className="grid gap-4">
      <h2 id="cofres" className="flex items-center gap-2 text-lg font-semibold"><Gem size={20} strokeWidth={1.5} className="text-magenta" /> Cofres patrimoniais</h2>
      <div className="grid gap-4 lg:grid-cols-2">{state.vaults.map(vault => <VaultCard key={vault.id} vault={vault} />)}</div>
    </section>
    {creating && <TransactionModal onClose={() => setCreating(false)} />}
  </div>;
}

function VaultCard({ vault }: { vault: Vault }) {
  const state = useMive();
  const [editing, setEditing] = useState(false);
  const [target, setTarget] = useState(vault.targetCents ? (vault.targetCents / 100).toLocaleString('pt-BR') : '');
  const [amount, setAmount] = useState('');
  const saved = vaultSaved(vault);
  const progress = vault.targetCents ? Math.min(1, saved / vault.targetCents) : undefined;
  const deposit = () => { const cents = parseBRL(amount); if (!cents) return; state.addDeposit(vault.id, cents, todayISO()); setAmount(''); };
  return <GlassCard className="grid gap-4">
    <div className="flex items-start justify-between gap-3">
      <div><h3 className="text-lg font-semibold">{vault.name}</h3><p className="mt-1 text-2xl font-bold tabular-nums">{formatBRL(saved)}</p><p className="text-sm text-muted">{vault.targetCents ? `de ${formatBRL(vault.targetCents)}` : 'Meta ainda não definida'}</p></div>
      {progress !== undefined && <Tag tone="magenta">{Math.round(progress * 100)}%</Tag>}
    </div>
    <div className="h-3 overflow-hidden rounded-full bg-line/10" role="progressbar" aria-label={`Progresso de ${vault.name}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round((progress ?? 0) * 100)}><div className="h-full rounded-full bg-grad-magenta transition-all duration-500" style={{ width: `${(progress ?? 0) * 100}%` }} /></div>
    {editing ? <form className="flex items-end gap-2" onSubmit={event => { event.preventDefault(); state.updateVault(vault.id, { targetCents: parseBRL(target) ?? 0 }); setEditing(false); }}>
      <div className="flex-1"><Input label="Meta do cofre (R$)" inputMode="decimal" value={target} onChange={event => setTarget(event.target.value)} placeholder="150.000" autoFocus /></div>
      <Button type="submit">Salvar</Button>
    </form> : <Button variant="ghost" size="sm" className="justify-self-start" onClick={() => setEditing(true)}><Pencil size={15} strokeWidth={1.75} /> {vault.targetCents ? 'Editar meta' : 'Definir meta'}</Button>}
    <form className="flex items-center gap-2" onSubmit={event => { event.preventDefault(); deposit(); }}>
      <label className="sr-only" htmlFor={`aporte-${vault.id}`}>Novo aporte em {vault.name}</label>
      <input id={`aporte-${vault.id}`} inputMode="decimal" value={amount} onChange={event => setAmount(event.target.value)} placeholder="Novo aporte · R$" className="h-11 min-w-0 flex-1 rounded-2xl border border-line/15 bg-white/70 px-4 text-sm font-medium outline-none focus:border-magenta focus:ring-4 focus:ring-magenta/15 dark:bg-white/5" />
      <Button type="submit" variant="secondary" size="sm" disabled={!parseBRL(amount)}>Aportar</Button>
    </form>
    {vault.deposits.length > 0 && <ul className="grid gap-1 text-sm">{[...vault.deposits].reverse().slice(0, 5).map(item => <li key={item.id} className="flex items-center gap-2"><span className="flex-1 text-ink-soft">{formatDay(item.date, "d 'de' MMM")}{item.transactionId && ' · do livro-caixa'}</span><span className="font-semibold tabular-nums">{formatBRL(item.amountCents)}</span><button type="button" onClick={() => state.removeDeposit(vault.id, item.id)} aria-label="Remover aporte" className="grid h-11 w-11 place-items-center rounded-full text-muted hover:text-magenta"><X size={15} strokeWidth={1.75} /></button></li>)}</ul>}
  </GlassCard>;
}

/** "+ Nova Transação": também usado pelo "+ Registrar" global. */
export function TransactionModal({ onClose }: { onClose: () => void }) {
  const state = useMive();
  const [kind, setKind] = useState<TransactionKind>('despesa');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [date, setDate] = useState(todayISO());
  const [destination, setDestination] = useState('');
  const [vaultId, setVaultId] = useState('');
  const cents = parseBRL(amount);
  const categories = [...new Set(state.transactions.map(item => item.category))];
  const save = () => {
    if (!cents || !category.trim() || !date) return;
    state.addTransaction({ kind, amountCents: cents, category: category.trim(), date, destination: destination.trim() || undefined, vaultId: kind === 'despesa' && vaultId ? vaultId : undefined });
    onClose();
  };
  return <Modal open onClose={onClose} title="Nova Transação" eyebrow="Finanças">
    <form className="grid gap-4" onSubmit={event => { event.preventDefault(); save(); }}>
      <Tabs label="Tipo de transação" value={kind} onChange={setKind} options={[{ value: 'despesa', label: 'Despesa' }, { value: 'receita', label: 'Receita' }]} />
      <div className="grid grid-cols-2 gap-3"><Input label="Valor (R$)" inputMode="decimal" value={amount} onChange={event => setAmount(event.target.value)} placeholder="0,00" autoFocus /><Input label="Data" type="date" value={date} onChange={event => setDate(event.target.value)} /></div>
      <Input label="Categoria" list="mive-categorias" value={category} onChange={event => setCategory(event.target.value)} placeholder={kind === 'receita' ? 'Ex.: Salário' : 'Ex.: Mercado'} />
      <datalist id="mive-categorias">{categories.map(item => <option key={item} value={item} />)}</datalist>
      <Input label={kind === 'receita' ? 'Origem' : 'Destino'} value={destination} onChange={event => setDestination(event.target.value)} placeholder={kind === 'receita' ? 'Ex.: Empresa X' : 'Ex.: Cartão Nubank'} hint="Opcional" />
      {kind === 'despesa' && <Select label="É um aporte em cofre?" value={vaultId} onChange={event => setVaultId(event.target.value)} options={[{ value: '', label: 'Não' }, ...state.vaults.map(vault => ({ value: vault.id, label: vault.name }))]} />}
      <Button type="submit" disabled={!cents || !category.trim()}>Lançar {cents ? formatBRL(cents) : ''}</Button>
    </form>
  </Modal>;
}
