import type { CalendarEvent, CheckupKind, CisInstrument, ExpenseCategory, FinanceCategory, FlashcardDeck, FlashcardRating, IdeaCategory, IncomeCategory, Playlist, Task } from './models';

/** Labels in pt-BR, shared by every screen. */

export const APP_NAME = 'Mive';

export const incomeCategories: Record<IncomeCategory, string> = { salary: 'Salário', prolabore: 'Pró-labore', freelance: 'Freelas e serviços', sales: 'Vendas CAVU', investments: 'Rendimentos', other_income: 'Outras entradas' };
export const expenseCategories: Record<ExpenseCategory, string> = { housing: 'Moradia e contas', food: 'Alimentação e mercado', transport: 'Transporte', health: 'Saúde e farmácia', education: 'Educação e cursos', leisure: 'Lazer', subscriptions: 'Assinaturas', taxes: 'Impostos e taxas', personal_care: 'Cuidados pessoais', business: 'Investimento na CAVU', other_expense: 'Outras saídas' };
export const categoryLabel = (category: FinanceCategory) => category === 'vault' ? 'Cofre' : (incomeCategories as Record<string, string>)[category] ?? (expenseCategories as Record<string, string>)[category] ?? category;

export const checkupLabels: Record<CheckupKind, { title: string; short: string; lastPhrase: string }> = {
  blood_test: { title: 'Exame de sangue', short: 'Último exame de sangue', lastPhrase: 'seu último exame de sangue foi' },
  medical: { title: 'Consulta médica ou ginecológica', short: 'Última consulta médica', lastPhrase: 'sua última consulta médica foi' },
  dental: { title: 'Dentista', short: 'Última ida ao dentista', lastPhrase: 'sua última ida ao dentista foi' }
};

export const ideaCategories: Record<IdeaCategory, { label: string; color: string }> = { cavu: { label: 'CAVU', color: '#f3197d' }, cafe_baiano: { label: 'Café Baiano', color: '#ff8a32' }, geral: { label: 'Geral', color: '#8767ed' } };
export const deckLabels: Record<FlashcardDeck, string> = { english: 'Inglês', legislacao: 'Legislação' };
export const ratingLabels: Record<FlashcardRating, string> = { easy: 'Fácil', medium: 'Médio', hard: 'Difícil' };
export const moodLabels: Record<Playlist['mood'], string> = { focus: 'Foco', workout: 'Treino', calm: 'Calma' };
export const cisLabels: Record<CisInstrument, { tab: string; title: string }> = { maas: { tab: 'MAAS · pág. 45', title: 'Avaliação inicial MAAS' }, mais: { tab: 'MAIS · pág. 108', title: 'Avaliação MAIS' }, eval55: { tab: 'Autoavaliação 55 pontos', title: 'Autoavaliação de 55 pontos' } };

export const eventStatusLabel: Record<CalendarEvent['status'], string> = { planned: 'Planejado', confirmed: 'Confirmado', cancelled: 'Cancelado' };
export const eventSourceLabel: Record<CalendarEvent['source'], string> = { manual: 'Mive', google: 'Google Calendar' };
export const originLabel: Record<Task['origin'], string> = { planned: 'Tarefa', captured: 'Demanda', idea: 'Ideia' };

export const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
export const formatBRL = (cents: number) => brl.format(cents / 100);
export const formatBRLCompact = (cents: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact', maximumFractionDigits: 1 }).format(cents / 100);
/** Accepts "1.234,56", "1234,56" or "1234.56". Returns cents, or null when invalid. */
export function parseBRL(input: string): number | null {
  const clean = input.replace(/[R$\s]/g, '');
  const normalized = clean.includes(',') ? clean.replace(/\./g, '').replace(',', '.') : clean;
  const value = Number(normalized);
  return Number.isFinite(value) && value > 0 ? Math.round(value * 100) : null;
}

/**
 * Anti-dispersion guard. A focus item must read as a physical action: an infinitive or
 * imperative verb first, and something concrete after it ("Enviar mensagem ao fornecedor").
 */
const vague = new Set(['pensar', 'ver', 'tentar', 'focar', 'organizar', 'planejar', 'refletir', 'estudar', 'trabalhar', 'cuidar', 'melhorar']);
export function physicalActionIssue(title: string): string | undefined {
  const words = title.trim().toLocaleLowerCase('pt-BR').split(/\s+/).filter(Boolean);
  if (words.length < 3) return 'Descreva a ação completa: verbo + o quê + com quem ou quanto. Ex.: Enviar mensagem ao fornecedor.';
  const verb = words[0].normalize('NFD').replace(/[̀-ͯ]/g, '');
  if (!/(ar|er|ir|or)$/.test(verb) && !/^(envie|ligue|resolva|escreva|grave|publique|marque|pague|treine|leia|revise|faca|feche)$/.test(verb)) return 'Comece com um verbo de ação. Ex.: Resolver 30 questões de Direito Administrativo.';
  if (vague.has(verb) && words.length < 5) return `"${words[0]}" é amplo demais. Diga o que fica pronto no fim: quantidade, entrega ou pessoa.`;
  return undefined;
}
