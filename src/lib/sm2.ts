import { addDays } from 'date-fns';
import type { Flashcard } from '../types';
import { fromISODate, toISODate, todayISO } from './dates';

/** Os 4 botões da revisão e a qualidade SM-2 (0 a 5) que cada um representa. */
export type Rating = 'novamente' | 'dificil' | 'bom' | 'facil';
export const ratingQuality: Record<Rating, number> = { novamente: 1, dificil: 3, bom: 4, facil: 5 };
export const ratingLabel: Record<Rating, string> = { novamente: 'Novamente', dificil: 'Difícil', bom: 'Bom', facil: 'Fácil' };
export const MIN_EASE = 1.3;

/**
 * SM-2 (Wozniak, 1987):
 * - EF' = EF + (0,1 − (5 − q) × (0,08 + (5 − q) × 0,02)), nunca abaixo de 1,3
 * - q < 3: repetições voltam a 0 e o intervalo a 1 dia
 * - q ≥ 3: 1ª repetição = 1 dia, 2ª = 6 dias, depois intervalo × EF
 */
export function sm2(card: Pick<Flashcard, 'ease' | 'interval' | 'repetitions'>, rating: Rating, today = todayISO()) {
  const q = ratingQuality[rating];
  const ease = Math.max(MIN_EASE, Math.round((card.ease + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))) * 100) / 100);
  let repetitions: number; let interval: number;
  if (q < 3) { repetitions = 0; interval = 1; }
  else {
    repetitions = card.repetitions + 1;
    interval = repetitions === 1 ? 1 : repetitions === 2 ? 6 : Math.round(card.interval * ease);
  }
  return { ease, interval, repetitions, due: toISODate(addDays(fromISODate(today), interval)) };
}

export const isDue = (card: Pick<Flashcard, 'due'>, today = todayISO()) => card.due <= today;
export const intervalLabel = (days: number) => days === 1 ? '1 dia' : days < 30 ? `${days} dias` : days < 365 ? `${Math.round(days / 30)} ${Math.round(days / 30) === 1 ? 'mês' : 'meses'}` : `${(days / 365).toFixed(1).replace('.', ',')} anos`;
