const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
/** Formata centavos como R$ 1.234,56. */
export const formatBRL = (cents: number) => brl.format(cents / 100);
/** Lê "1.234,56", "1234.56" ou "1234" e devolve centavos. Inválido → undefined. */
export function parseBRL(text: string): number | undefined {
  const clean = text.replace(/[^\d,.-]/g, '');
  if (!clean) return undefined;
  const normalized = clean.includes(',') || /^\d{1,3}(\.\d{3})+$/.test(clean) ? clean.replace(/\./g, '').replace(',', '.') : clean;
  const value = Number(normalized);
  return Number.isFinite(value) && value > 0 ? Math.round(value * 100) : undefined;
}
