import { cycleOf, type EntityId, type FinanceVault, type Goal, type Habit, type IdentityVersion, type LifeSnapshot, type OwnedEntity, type Project } from '../domain/models';
import { seedLifeAreas } from './areas';

/**
 * Starter plan, created once on the first access (cloud or demo).
 * Only structure: areas, the 4 goals of the cycle, their habits, the CAVU project and the vaults.
 * No facts are created here, so every number starts at zero and grows with real records.
 * Vault targets start at 0: the person defines them in Finanças.
 */
export const starterIds = {
  goals: { shape: 'goal-shape', cavu: 'goal-cavu', prf: 'goal-prf', apartment: 'goal-apartment' },
  project: { cavu: 'project-cavu' },
  habits: { training: 'habit-training', water: 'habit-water', food: 'habit-clean-food', study: 'habit-prf-study' },
  vaults: { cavu: 'vault-cavu', apartment: 'vault-apartment' }
} as const;

export const identityStarter = {
  core: 'Sou uma mulher estratégica, sensível e corajosa. Eu me escuto, escolho com intenção e transformo visão em movimento.',
  becoming: 'Estou me tornando uma mulher ainda mais presente, livre para ocupar espaço e consistente com o que acredita.',
  acting: 'Escolho agir com clareza, gentileza e coragem, especialmente quando algo importa.',
  positioning: 'Quero ser percebida pela combinação de profundidade, repertório e uma energia que faz as coisas acontecerem.',
  declaration: 'Eu me movimento com coragem em direção à vida que quero viver.',
  strengthen: ['Coragem para me mostrar', 'Consistência gentil', 'Visão estratégica'],
  transform: ['Perfeccionismo que paralisa', 'Pressa que me desconecta', 'Medo de começar']
};

export function createStarterPlan(userId: EntityId, now = new Date()): Pick<LifeSnapshot, 'areas' | 'goals' | 'projects' | 'habits' | 'vaults' | 'identityVersions'> {
  const stamp = now.toISOString();
  const owned = <T extends OwnedEntity>(id: string, value: Omit<T, keyof OwnedEntity>) => ({ ...value, id, userId, createdAt: stamp, updatedAt: stamp }) as T;
  const cycle = cycleOf(now);
  const { goals: g, project: p, habits: h, vaults: v } = starterIds;

  const goals: Goal[] = [
    owned<Goal>(g.shape, { title: 'Shape dos sonhos · 65 kg', areaId: 'health', cycle, horizon: 'current', status: 'active', measure: { kind: 'weight', targetKg: 65 }, why: 'Treino, água e comida de verdade, todos os dias.' }),
    owned<Goal>(g.cavu, { title: 'Lançamento da CAVU', areaId: 'professional', cycle, horizon: 'current', status: 'active', why: 'Minha marca própria no mundo.' }),
    owned<Goal>(g.prf, { title: 'Aprovação no concurso PRF', areaId: 'professional', cycle, horizon: 'current', status: 'active', why: 'Agente Administrativo · um bloco de estudo por dia.' }),
    owned<Goal>(g.apartment, { title: 'Estrutura financeira e entrada do apartamento', areaId: 'finance', cycle, horizon: 'current', status: 'active', why: 'Segurança para o próximo capítulo.' })
  ];
  const projects: Project[] = [owned<Project>(p.cavu, { title: 'Projeto CAVU', areaId: 'professional', goalId: g.cavu, status: 'active', focus: true })];
  const habits: Habit[] = [
    owned<Habit>(h.training, { title: 'Treino', areaId: 'health', goalId: g.shape, frequency: 'daily', icon: '◒', active: true }),
    owned<Habit>(h.water, { title: 'Hidratação · 2 litros', areaId: 'health', goalId: g.shape, frequency: 'daily', icon: '◌', active: true }),
    owned<Habit>(h.food, { title: 'Alimentação limpa', areaId: 'health', goalId: g.shape, frequency: 'daily', icon: '✦', active: true }),
    owned<Habit>(h.study, { title: 'Bloco de estudos PRF', areaId: 'intellectual', goalId: g.prf, frequency: 'daily', icon: '⌁', active: true })
  ];
  const vaults: FinanceVault[] = [
    owned<FinanceVault>(v.cavu, { name: 'Reserva de lançamento CAVU', targetCents: 0, goalId: g.cavu, color: '#f3197d', icon: '✦' }),
    owned<FinanceVault>(v.apartment, { name: 'Entrada do apartamento', targetCents: 0, goalId: g.apartment, color: '#8767ed', icon: '⌂' })
  ];
  const identityVersions: IdentityVersion[] = [owned<IdentityVersion>('identity-1', { ...identityStarter, savedAt: stamp })];
  return { areas: seedLifeAreas(userId, now), goals, projects, habits, vaults, identityVersions };
}
