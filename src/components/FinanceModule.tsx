import { useState } from 'react';
import { categoryLabel, expenseCategories, formatBRL, incomeCategories, parseBRL } from '../domain/catalog';
import { toISODate, type ExpenseCategory, type FinanceEntry, type FinanceVault, type IncomeCategory } from '../domain/models';
import { expensesByCategory, financeOverview, formatDay, goalProgress, percent, vaultProgress } from '../domain/selectors';
import { useLife } from '../state/LifeStore';
import { Button } from './Button';
import { Card } from './Card';
import { Dialog, EmptyState, Field, PageIntro, ProgressBar, SectionHeading } from './ui';

type EntryKind = 'income' | 'expense';

/**
 * Capital manager. Entries are facts (append-only). Vaults are plans with a target;
 * their balance is the sum of deposits and they are untouchable: there is no withdrawal.
 */
export function FinanceModule() {
  const { snapshot, mode } = useLife();
  const [entryKind, setEntryKind] = useState<EntryKind | null>(null);
  const [depositVault, setDepositVault] = useState<FinanceVault | null>(null);
  const [targetVault, setTargetVault] = useState<FinanceVault | null>(null);
  const now = new Date();
  const overview = financeOverview(snapshot, now);
  const categories = expensesByCategory(snapshot, now);
  const maxCategory = categories[0]?.cents ?? 0;
  const entries = snapshot.financeEntries.slice().sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)).slice(0, 20);

  return <>
    <PageIntro eyebrow="ACOMPANHAR" title="Finanças" text="Seu capital com clareza: o que entra, o que sai e o que está guardado para os seus sonhos." action={<><Button onClick={() => setEntryKind('expense')}>Nova saída −</Button><Button variant="primary" onClick={() => setEntryKind('income')}>Nova entrada ＋</Button></>} />
    {mode === 'demo' && <p className="note">Modo demonstração. Os valores são exemplos desta sessão.</p>}

    <section className="stat-grid">
      <Card tone="noble" className="stat stat-hero"><span className="label">SALDO ATUAL</span><b>{formatBRL(overview.balanceCents)}</b><small>Disponível, fora dos cofres</small></Card>
      <Card className="stat"><span className="label">RECEBIDO NO MÊS</span><b className="positive">{formatBRL(overview.monthIncomeCents)}</b><small>{overview.monthLabel}</small></Card>
      <Card className="stat"><span className="label">GASTO NO MÊS</span><b className="negative">{formatBRL(overview.monthExpenseCents)}</b><small>{overview.monthIncomeCents ? `${percent(Math.min(1, overview.monthExpenseCents / overview.monthIncomeCents))}% do que entrou` : 'Sem entradas no mês'}</small></Card>
      <Card className="stat"><span className="label">GUARDADO NOS COFRES</span><b className="vault">{formatBRL(overview.vaultTotalCents)}</b><small>{overview.monthSavedCents ? `${formatBRL(overview.monthSavedCents)} neste mês` : 'Nenhum aporte neste mês'}</small></Card>
    </section>

    <SectionHeading label="COFRES DE DESTINO" title="Intocáveis, com destino certo" />
    <section className="vault-grid">{snapshot.vaults.map(vault => {
      const { balance, ratio, remaining } = vaultProgress(vault, snapshot);
      const goal = snapshot.goals.find(item => item.id === vault.goalId);
      return <Card key={vault.id} className="vault-card" style={{ ['--vault-color' as string]: vault.color }}>
        <div className="vault-top"><span className="vault-icon">{vault.icon}</span><span className="lock" title="Cofre intocável">🔒</span></div>
        <h3>{vault.name}</h3>
        {goal && <small className="vault-goal">Meta · {goal.title}</small>}
        <div className="vault-amount"><b>{formatBRL(balance)}</b><span>{vault.targetCents ? `de ${formatBRL(vault.targetCents)}` : 'Meta ainda não definida'}</span></div>
        <ProgressBar value={ratio} color={vault.color} label={vault.name} />
        <div className="vault-foot"><span>{ratio === undefined ? 'Defina um valor alvo para ver o progresso' : ratio >= 1 ? 'Cofre completo ✦' : `${percent(ratio)}% · faltam ${formatBRL(remaining)}`}</span></div>
        <div className="vault-actions"><Button variant="primary" onClick={() => setDepositVault(vault)}>Guardar</Button><Button variant="ghost" onClick={() => setTargetVault(vault)}>{vault.targetCents ? 'Ajustar meta' : 'Definir meta'}</Button></div>
      </Card>;
    })}</section>

    <section className="central-grid two">
      <div>
        <SectionHeading label="MOVIMENTAÇÕES" title="Últimos registros" />
        <Card className="ledger">{entries.length ? entries.map(entry => <LedgerLine key={entry.id} entry={entry} vaultName={snapshot.vaults.find(vault => vault.id === entry.vaultId)?.name} />) : <EmptyState icon="◈">Registre sua primeira entrada para começar.</EmptyState>}</Card>
        <p className="fine-print">Registros financeiros são históricos: uma correção entra como um novo lançamento.</p>
      </div>
      <div>
        <SectionHeading label="PARA ONDE FOI" title={`Gastos de ${overview.monthLabel}`} />
        <Card className="category-card">{categories.length ? categories.map(item => <div key={item.category} className="category-line"><span>{categoryLabel(item.category as ExpenseCategory)}</span><b>{formatBRL(item.cents)}</b><ProgressBar value={maxCategory ? item.cents / maxCategory : 0} label={categoryLabel(item.category as ExpenseCategory)} /></div>) : <EmptyState icon="◌">Nenhum gasto registrado neste mês.</EmptyState>}</Card>
        <GoalLinks />
      </div>
    </section>

    {entryKind && <EntryDialog kind={entryKind} onClose={() => setEntryKind(null)} />}
    {depositVault && <DepositDialog vault={depositVault} available={overview.balanceCents} onClose={() => setDepositVault(null)} />}
    {targetVault && <TargetDialog vault={targetVault} onClose={() => setTargetVault(null)} />}
  </>;
}

function GoalLinks() {
  const { snapshot } = useLife();
  const goals = snapshot.goals.filter(goal => snapshot.vaults.some(vault => vault.goalId === goal.id));
  if (!goals.length) return null;
  return <Card className="goal-links"><span className="label">METAS CONECTADAS</span>{goals.map(goal => { const progress = goalProgress(snapshot, goal); return <div key={goal.id} className="goal-link"><span>{goal.title}</span><b>{progress.value === undefined ? '·' : `${percent(progress.value)}%`}</b></div>; })}<small>O progresso da meta soma cofres, ações e hábitos conectados.</small></Card>;
}

function LedgerLine({ entry, vaultName }: { entry: FinanceEntry; vaultName?: string }) {
  const sign = entry.type === 'income' ? '+' : '−';
  return <div className={`ledger-line ledger-${entry.type}`}>
    <span className="ledger-icon">{entry.type === 'income' ? '↓' : entry.type === 'expense' ? '↑' : '🔒'}</span>
    <div><strong>{entry.description || categoryLabel(entry.category)}</strong><small>{formatDay(entry.date)} · {entry.type === 'vault_deposit' ? `Cofre ${vaultName ?? ''}` : categoryLabel(entry.category)}</small></div>
    <b>{sign} {formatBRL(entry.amountCents)}</b>
  </div>;
}

function EntryDialog({ kind, onClose }: { kind: EntryKind; onClose: () => void }) {
  const { addFinanceEntry } = useLife();
  const options = kind === 'income' ? incomeCategories : expenseCategories;
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(toISODate(new Date()));
  const [category, setCategory] = useState(Object.keys(options)[0]);
  const [description, setDescription] = useState('');
  const cents = parseBRL(amount);
  const submit = () => { if (!cents || !date) return; addFinanceEntry({ type: kind, amountCents: cents, date, category: category as IncomeCategory | ExpenseCategory, description }); onClose(); };
  return <Dialog eyebrow={kind === 'income' ? 'NOVA ENTRADA' : 'NOVA SAÍDA'} title={kind === 'income' ? 'Quanto entrou?' : 'Quanto saiu?'} onClose={onClose} onSubmit={submit} submitLabel="Registrar">
    <Field label="Valor em reais" hint={amount && !cents ? 'Use números, por exemplo 1.250,90' : undefined}><input autoFocus inputMode="decimal" value={amount} onChange={event => setAmount(event.target.value)} placeholder="R$ 0,00" /></Field>
    <div className="field-row"><Field label="Data"><input type="date" value={date} onChange={event => setDate(event.target.value)} /></Field><Field label="Categoria"><select value={category} onChange={event => setCategory(event.target.value)}>{Object.entries(options).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></Field></div>
    <Field label="Descrição"><input value={description} onChange={event => setDescription(event.target.value)} placeholder={kind === 'income' ? 'Ex.: Salário de novembro' : 'Ex.: Mercado da semana'} /></Field>
  </Dialog>;
}

function DepositDialog({ vault, available, onClose }: { vault: FinanceVault; available: number; onClose: () => void }) {
  const { depositToVault } = useLife();
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(toISODate(new Date()));
  const cents = parseBRL(amount);
  const submit = () => { if (!cents) return; depositToVault(vault.id, cents, date); onClose(); };
  return <Dialog eyebrow="GUARDAR NO COFRE" title={vault.name} onClose={onClose} onSubmit={submit} submitLabel="Guardar">
    <Field label="Valor" hint={`Saldo disponível: ${formatBRL(available)}`}><input autoFocus inputMode="decimal" value={amount} onChange={event => setAmount(event.target.value)} placeholder="R$ 0,00" /></Field>
    <Field label="Data"><input type="date" value={date} onChange={event => setDate(event.target.value)} /></Field>
    <p className="fine-print">Este cofre é intocável: o valor sai do saldo disponível e fica reservado para este destino.</p>
  </Dialog>;
}

function TargetDialog({ vault, onClose }: { vault: FinanceVault; onClose: () => void }) {
  const { setVaultTarget } = useLife();
  const [amount, setAmount] = useState(vault.targetCents ? (vault.targetCents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '');
  const cents = parseBRL(amount);
  const submit = () => { if (!cents) return; setVaultTarget(vault.id, cents); onClose(); };
  return <Dialog eyebrow="META DO COFRE" title={vault.name} onClose={onClose} onSubmit={submit} submitLabel="Salvar meta">
    <Field label="Valor alvo"><input autoFocus inputMode="decimal" value={amount} onChange={event => setAmount(event.target.value)} placeholder="R$ 0,00" /></Field>
  </Dialog>;
}
