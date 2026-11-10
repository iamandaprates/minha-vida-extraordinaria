import { cycleOf, emptySnapshot, type CisRecord, type EntityId, type FinanceVault, type Flashcard, type Goal, type Habit, type IdentityProfile, type LifeSnapshot, type OwnedEntity, type Playlist, type Project, type StudySubject, type Task } from '../domain/models';
import { seedLifeAreas } from './areas';

/**
 * Initial state of Mive for Mands, created once on the first access (cloud or demo).
 *
 * Only real information: the CIS instruments as recorded, the identity declarations,
 * the 5 goals of the cycle with their habits, projects and next physical actions.
 * No facts of execution are invented: weights, money, sessions and completions start
 * empty and grow with real records. Vault targets start at 0 until Mands defines them.
 */
export const seedIds = {
  goals: { shape: 'goal-shape', cavu: 'goal-cavu', prf: 'goal-prf', finance: 'goal-finance', english: 'goal-english' },
  projects: { cavu: 'project-cavu', prf: 'project-prf' },
  vaults: { cavu: 'vault-cavu', apartment: 'vault-apartment' }
} as const;

export function createSeed(userId: EntityId, now = new Date()): LifeSnapshot {
  const stamp = now.toISOString();
  const owned = <T extends OwnedEntity>(id: string, value: Omit<T, keyof OwnedEntity>) => ({ ...value, id, userId, createdAt: stamp, updatedAt: stamp }) as T;
  const cycle = cycleOf(now);
  const g = seedIds.goals; const p = seedIds.projects; const v = seedIds.vaults;

  const goals: Goal[] = [
    owned<Goal>(g.shape, { title: 'Shape dos Sonhos (65 kg)', areaId: 'health', cycle, horizon: 'current', status: 'active', position: 1, pillar: 'health', color: '#48c972', why: 'Marcos: 85 kg → 70 kg → 65 kg', measure: { kind: 'weight', startKg: 85, targetKg: 65, checkpointsKg: [70] } }),
    owned<Goal>(g.cavu, { title: 'Lançamento e Primeiras Vendas CAVU', areaId: 'professional', cycle, horizon: 'current', status: 'active', position: 2, pillar: 'business', color: '#f3197d', why: 'Moda fitness · marca própria' }),
    owned<Goal>(g.prf, { title: 'Aprovação Concurso PRF', areaId: 'intellectual', cycle, horizon: 'current', status: 'active', position: 3, pillar: 'studies', color: '#8767ed', why: 'Agente Administrativo' }),
    owned<Goal>(g.finance, { title: 'Estruturação Financeira & Apartamento Vista Mar', areaId: 'finance', cycle, horizon: 'current', status: 'active', position: 4, pillar: 'finance', color: '#ff8a32', why: 'Meta pessoal R$ 50 mil/mês · visão empresarial R$ 20M/ano', measure: { kind: 'monthlyIncome', targetCents: 5_000_000 } }),
    owned<Goal>(g.english, { title: 'Fluência em Inglês', areaId: 'intellectual', cycle, horizon: 'current', status: 'active', position: 5, pillar: 'language', color: '#ff5c72', why: 'Resgate do curso pago, conversação diária e flashcards' })
  ];
  const projects: Project[] = [
    owned<Project>(p.cavu, { title: 'Projeto CAVU', areaId: 'professional', goalId: g.cavu, status: 'active', focus: true }),
    owned<Project>(p.prf, { title: 'Projeto PRF', areaId: 'intellectual', goalId: g.prf, status: 'active' })
  ];
  const task = (id: string, value: Omit<Task, keyof OwnedEntity | 'origin' | 'priority'> & Partial<Pick<Task, 'priority'>>) => owned<Task>(id, { origin: 'planned', priority: 'normal', ...value });
  const tasks: Task[] = [
    task('task-cavu-tecidos', { title: 'Definir os tecidos da coleção CAVU', areaId: 'professional', projectId: p.cavu }),
    task('task-cavu-modelagem', { title: 'Fechar a modelagem das peças CAVU', areaId: 'professional', projectId: p.cavu }),
    task('task-cavu-fornecedores', { title: 'Enviar mensagem aos fornecedores da CAVU', areaId: 'professional', projectId: p.cavu, priority: 'high' }),
    task('task-cavu-lancamento', { title: 'Lançar a CAVU', areaId: 'professional', projectId: p.cavu, isMilestone: true }),
    task('task-cavu-primeira-venda', { title: 'Fazer a primeira venda da CAVU', areaId: 'professional', projectId: p.cavu, isMilestone: true }),
    task('task-prf-bloco-1', { title: 'Fechar o Bloco 1 da PRF', areaId: 'intellectual', projectId: p.prf, isMilestone: true }),
    task('task-prf-questoes', { title: 'Resolver 30 questões de Direito Administrativo', areaId: 'intellectual', projectId: p.prf, priority: 'high' }),
    task('task-english-curso', { title: 'Resgatar o acesso ao curso de inglês pago', areaId: 'intellectual', goalId: g.english })
  ];
  const habit = (id: string, value: Omit<Habit, keyof OwnedEntity | 'frequency' | 'active'>) => owned<Habit>(id, { frequency: 'daily', active: true, ...value });
  const habits: Habit[] = [
    habit('habit-training', { title: 'Treino', areaId: 'health', goalId: g.shape, icon: 'dumbbell', blockMinutes: 60 }),
    habit('habit-water', { title: 'Hidratação · 3 litros', areaId: 'health', goalId: g.shape, icon: 'droplets' }),
    habit('habit-clean-food', { title: 'Alimentação limpa', areaId: 'health', goalId: g.shape, icon: 'salad' }),
    habit('habit-prf-study', { title: 'Bloco de estudos PRF', areaId: 'intellectual', goalId: g.prf, icon: 'book-open', blockMinutes: 50 }),
    habit('habit-english-talk', { title: 'Conversação em inglês', areaId: 'intellectual', goalId: g.english, icon: 'messages-square', blockMinutes: 20 }),
    habit('habit-flashcards', { title: 'Flashcards', areaId: 'intellectual', goalId: g.english, icon: 'layers' })
  ];
  const vaults: FinanceVault[] = [
    owned<FinanceVault>(v.cavu, { name: 'Cofre Marca CAVU', targetCents: 0, goalId: g.cavu, color: '#f3197d', icon: 'gem' }),
    owned<FinanceVault>(v.apartment, { name: 'Entrada Apartamento Vista Mar', targetCents: 0, goalId: g.finance, color: '#8767ed', icon: 'building-2' })
  ];
  // Subjects usually charged for Agente Administrativo. Adjust to the official edital.
  const prfSubjects = ['Língua Portuguesa', 'Raciocínio Lógico', 'Noções de Informática', 'Direito Constitucional', 'Direito Administrativo', 'Ética no Serviço Público', 'Legislação PRF', 'Arquivologia'];
  const studySubjects: StudySubject[] = [
    ...prfSubjects.map((name, position) => owned<StudySubject>(`subject-prf-${position + 1}`, { name, track: 'prf', position, goalId: g.prf })),
    owned<StudySubject>('subject-english-course', { name: 'Curso de inglês', track: 'english', position: 0, goalId: g.english }),
    owned<StudySubject>('subject-english-talk', { name: 'Conversação', track: 'english', position: 1, goalId: g.english })
  ];
  const cards: [string, string][] = [['How are you doing?', 'Como você está?'], ['I would like to schedule a meeting.', 'Eu gostaria de agendar uma reunião.'], ['Could you say that again, please?', 'Você pode repetir, por favor?'], ['I am working on my own brand.', 'Estou trabalhando na minha própria marca.'], ['What do you do for a living?', 'Com o que você trabalha?'], ['It is a pleasure to meet you.', 'É um prazer te conhecer.']];
  const flashcards: Flashcard[] = cards.map(([front, back], index) => owned<Flashcard>(`card-en-${index + 1}`, { deck: 'english', front, back }));

  const identityProfiles: IdentityProfile[] = [owned<IdentityProfile>('identity-1', {
    savedAt: stamp,
    declarations: ['Amor incondicional', 'Dedicada', 'Corajosa', 'Próspera', 'Mentalidade forte', 'Blindada contra opiniões alheias', 'Realizadora', 'Construtora de riqueza', 'Vitoriosa'],
    serFazerTer: {
      ser: ['CEO autêntica, segura e estratégica'],
      fazer: ['Cumprir a rotina', 'Treinar rumo aos 65 kg', 'Dedicar tempo às marcas'],
      ter: ['Apartamento de luxo com vista mar em Salvador', 'R$ 20 milhões por ano', 'Ecossistema de marcas', 'Capa da Forbes Under 30', 'Família amorosa']
    },
    references: [{ name: 'Jesus Cristo' }, { name: 'Samuel', relation: 'Pai' }, { name: 'Carlinhos Maia' }]
  })];

  const cisRecords: CisRecord[] = [
    owned<CisRecord>('cis-maas', { instrument: 'maas', title: 'Avaliação inicial MAAS', source: 'Método CIS · pág. 45', scale: 10, scores: [['Espiritual', 7], ['Parentes', 6], ['Conjugal', 5], ['Filhos', null], ['Social', 1], ['Saúde', 5], ['Servir', 1], ['Intelectual', 8], ['Financeiro', 2], ['Profissional', 3], ['Emocional', 4]].map(([label, score]) => ({ label: label as string, score: score as number | null })), priorities: ['Financeiro', 'Profissional', 'Servir', 'Saúde', 'Social'] }),
    owned<CisRecord>('cis-mais', { instrument: 'mais', title: 'Avaliação MAIS', source: 'Método CIS · pág. 108', scale: 10, scores: [['Parental', 10], ['Conjugal', 10], ['Servir', 10], ['Espiritual', 9], ['Saúde', 8], ['Intelectual', 8], ['Financeiro', 8], ['Profissional', 8], ['Recursos', 6], ['Social', 5], ['Emocional', 5], ['Gestão do tempo', 3], ['Resiliência', 3]].map(([label, score]) => ({ label: label as string, score: score as number })) }),
    owned<CisRecord>('cis-eval55', { instrument: 'eval55', title: 'Autoavaliação de 55 pontos', source: 'Método CIS · autoavaliação de 55 pontos', scale: 10, totalPoints: 55, scores: [{ label: 'Gestão de tempo e energia', score: 3 }, { label: 'Resiliência', score: 3 }], bottlenecks: ['Gestão de tempo e energia', 'Resiliência'] })
  ];

  // Spotify editorial playlists as a starting point. Replace them with your own links.
  const playlists: Playlist[] = [
    owned<Playlist>('playlist-focus', { name: 'Deep Focus', mood: 'focus', spotifyUri: 'spotify:playlist:37i9dQZF1DWZeKCadgRdKQ', position: 0 }),
    owned<Playlist>('playlist-workout', { name: 'Beast Mode', mood: 'workout', spotifyUri: 'spotify:playlist:37i9dQZF1DX76Wlfdnj7AP', position: 1 }),
    owned<Playlist>('playlist-calm', { name: 'Peaceful Piano', mood: 'calm', spotifyUri: 'spotify:playlist:37i9dQZF1DX4sWSpwq3LiO', position: 2 })
  ];

  return { ...emptySnapshot(), areas: seedLifeAreas(userId, now), goals, projects, tasks, habits, vaults, studySubjects, flashcards, identityProfiles, cisRecords, playlists };
}

/** Collections written on first access, in dependency order (areas and goals first). */
export const seedOrder = ['areas', 'goals', 'projects', 'tasks', 'habits', 'vaults', 'studySubjects', 'flashcards', 'identityProfiles', 'cisRecords', 'playlists'] as const;
