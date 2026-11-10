import type { CalendarEvent, CheckupKind, ExpenseCategory, FinanceCategory, IncomeCategory, Task } from './models';

/** Labels in pt-BR. Kept out of components so every screen speaks the same language. */

export const incomeCategories: Record<IncomeCategory, string> = {
  salary: 'Salário',
  prolabore: 'Pró-labore',
  freelance: 'Freelas e serviços',
  sales: 'Vendas CAVU',
  investments: 'Rendimentos',
  other_income: 'Outras entradas'
};
export const expenseCategories: Record<ExpenseCategory, string> = {
  housing: 'Moradia e contas',
  food: 'Alimentação e mercado',
  transport: 'Transporte',
  health: 'Saúde e farmácia',
  education: 'Educação e cursos',
  leisure: 'Lazer',
  subscriptions: 'Assinaturas',
  taxes: 'Impostos e taxas',
  personal_care: 'Cuidados pessoais',
  business: 'Investimento na CAVU',
  other_expense: 'Outras saídas'
};
export const categoryLabel = (category: FinanceCategory) => category === 'vault' ? 'Cofre' : (incomeCategories as Record<string, string>)[category] ?? (expenseCategories as Record<string, string>)[category] ?? category;

export const checkupLabels: Record<CheckupKind, { title: string; short: string; lastPhrase: string }> = {
  blood_test: { title: 'Exame de sangue', short: 'Último exame de sangue', lastPhrase: 'seu último exame foi' },
  medical: { title: 'Consulta médica ou ginecológica', short: 'Última consulta médica', lastPhrase: 'sua última consulta médica foi' },
  dental: { title: 'Dentista', short: 'Última ida ao dentista', lastPhrase: 'sua última ida ao dentista foi' }
};

export const eventStatusLabel: Record<CalendarEvent['status'], string> = { planned: 'Planejado', confirmed: 'Confirmado', cancelled: 'Cancelado' };
export const eventSourceLabel: Record<CalendarEvent['source'], string> = { manual: 'Minha Vida', google: 'Google Calendar' };
export const originLabel: Record<Task['origin'], string> = { planned: 'Tarefa', captured: 'Demanda' };

export const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
export const formatBRL = (cents: number) => brl.format(cents / 100);
/** Accepts "1.234,56", "1234,56" or "1234.56". Returns cents, or null when invalid. */
export function parseBRL(input: string): number | null {
  const clean = input.replace(/[R$\s]/g, '');
  const normalized = clean.includes(',') ? clean.replace(/\./g, '').replace(',', '.') : clean;
  const value = Number(normalized);
  return Number.isFinite(value) && value > 0 ? Math.round(value * 100) : null;
}
