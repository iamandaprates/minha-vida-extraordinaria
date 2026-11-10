import type { EntityId, LifeArea } from '../domain/models';

/**
 * The 12 official life areas of Mive, in display order.
 * Ids are stable: existing records keep pointing to the same area when names change.
 * `relationship` is shown as Conjugal; `wellbeing` (Bem-estar & Imagem) is new.
 */
export type LifeAreaSeed = Pick<LifeArea, 'id' | 'name' | 'description' | 'icon' | 'color'>;

export const lifeAreas: LifeAreaSeed[] = [
  { id: 'professional', name: 'Profissional', description: 'Carreira CLT e transição.', icon: 'briefcase', color: '#f3197d' },
  { id: 'finance', name: 'Financeiro', description: 'Gestão manual de caixa e cofres.', icon: 'wallet', color: '#ff7b35' },
  { id: 'health', name: 'Saúde', description: 'Corpo, treinos, peso e exames médicos.', icon: 'heart-pulse', color: '#2fb36a' },
  { id: 'wellbeing', name: 'Bem-estar & Imagem', description: 'Dossiê de estilo, cartela, cabelo, unhas, dermatologia e autocuidado.', icon: 'flower', color: '#ed5eaa' },
  { id: 'intellectual', name: 'Intelectual', description: 'Concurso PRF, inglês, leituras, oratória e mentalidade.', icon: 'brain', color: '#8767ed' },
  { id: 'emotional', name: 'Emocional', description: 'Diário reflexivo, autorregulação e resiliência.', icon: 'smile', color: '#e0a400' },
  { id: 'spiritual', name: 'Espiritual', description: 'Fé, oração e propósito.', icon: 'sparkles', color: '#7769ee' },
  { id: 'relationship', name: 'Conjugal', description: 'Vida a dois, preparação e valores para o futuro relacionamento.', icon: 'heart', color: '#e0457b' },
  { id: 'family', name: 'Família', description: 'Pais e história compartilhada.', icon: 'house', color: '#4f8aff' },
  { id: 'social', name: 'Social', description: 'Amizades, conexões e networking.', icon: 'users', color: '#15b9ac' },
  { id: 'leisure', name: 'Lazer', description: 'Descanso real e viagens.', icon: 'plane', color: '#f59e0b' },
  { id: 'service', name: 'Servir', description: 'Generosidade e impacto.', icon: 'hand-heart', color: '#3fbba2' }
];
export const areaIds = new Set(lifeAreas.map(area => area.id));

/** Turns the catalogue into owned LifeArea entities for one person. */
export function seedLifeAreas(userId: EntityId, now = new Date()): LifeArea[] {
  const stamp = now.toISOString();
  return lifeAreas.map((area, position) => ({ ...area, position, diagnostic: 'unknown', userId, createdAt: stamp, updatedAt: stamp }));
}

/**
 * Brings stored areas in line with the catalogue: names, descriptions, icons, colours and
 * order come from the catalogue; the person's diagnostic is kept. Returns the areas to show
 * and the ones that must be written (new or changed). Retired areas stay in the database
 * (history keeps pointing to them) but leave the screen.
 */
export function reconcileAreas(stored: LifeArea[], userId: EntityId, now = new Date()) {
  const byId = new Map(stored.map(area => [area.id, area]));
  const changed: LifeArea[] = [];
  const areas = lifeAreas.map((seed, position) => {
    const current = byId.get(seed.id);
    const next: LifeArea = current ? { ...current, ...seed, position } : { ...seed, position, diagnostic: 'unknown', userId, createdAt: now.toISOString(), updatedAt: now.toISOString() };
    if (!current || current.name !== next.name || current.description !== next.description || current.icon !== next.icon || current.color !== next.color || current.position !== position) changed.push({ ...next, updatedAt: now.toISOString() });
    return next;
  });
  return { areas, changed };
}
