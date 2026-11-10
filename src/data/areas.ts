import type { EntityId, LifeArea } from '../domain/models';

/** Catalogue of the 12 life areas. Seeded once per person; afterwards each LifeArea lives in the cloud. */
export type LifeAreaSeed = Pick<LifeArea, 'id' | 'name' | 'description' | 'icon' | 'color'>;

export const lifeAreas: LifeAreaSeed[] = [
  { id: 'professional', name: 'Profissional', description: 'Trabalho, carreira e impacto que você constrói.', icon: 'briefcase', color: '#f3197d' },
  { id: 'finance', name: 'Financeiro', description: 'Relação com recursos, escolhas e segurança.', icon: 'wallet', color: '#ff7b35' },
  { id: 'intellectual', name: 'Intelectual', description: 'Conhecimento, curiosidade e repertório.', icon: 'brain', color: '#efbd22' },
  { id: 'social', name: 'Social', description: 'Conexões, presença e comunidade.', icon: 'users', color: '#43c879' },
  { id: 'relationship', name: 'Relacionamento', description: 'Parceria, intimidade e construção a dois.', icon: 'heart', color: '#15b9ac' },
  { id: 'family', name: 'Família', description: 'Laços, cuidado e história compartilhada.', icon: 'house', color: '#4f8aff' },
  { id: 'leisure', name: 'Lazer', description: 'Descanso, prazer e espaço para viver.', icon: 'sun', color: '#7769ee' },
  { id: 'health', name: 'Saúde', description: 'Corpo, energia e bem-estar.', icon: 'heart-pulse', color: '#b06ae8' },
  { id: 'emotional', name: 'Emocional', description: 'Sentimentos, presença e autocuidado.', icon: 'smile', color: '#ed5eaa' },
  { id: 'spiritual', name: 'Espiritual', description: 'Fé, propósito e vida interior.', icon: 'sparkles', color: '#8b6dce' },
  { id: 'service', name: 'Servir', description: 'Generosidade, contribuição e impacto.', icon: 'hand-heart', color: '#3fbba2' },
  { id: 'personal-development', name: 'Desenvolvimento Pessoal', description: 'Crescimento intencional e evolução.', icon: 'trending-up', color: '#eb4f64' }
];

/** Turns the catalogue into owned LifeArea entities for one person. */
export function seedLifeAreas(userId: EntityId, now = new Date()): LifeArea[] {
  const stamp = now.toISOString();
  return lifeAreas.map((area, position) => ({ ...area, position, diagnostic: 'unknown', userId, createdAt: stamp, updatedAt: stamp }));
}
