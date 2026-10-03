export type AreaDiagnostic = 'well' | 'attention' | 'critical' | 'unknown';
export type LifeAreaSeed = { id: string; name: string; description: string; icon: string; color: string };

export const lifeAreas: LifeAreaSeed[] = [
  { id: 'professional', name: 'Profissional', description: 'Trabalho, carreira e impacto que você constrói.', icon: '✦', color: '#f3197d' },
  { id: 'finance', name: 'Financeiro', description: 'Relação com recursos, escolhas e segurança.', icon: '◈', color: '#ff7b35' },
  { id: 'intellectual', name: 'Intelectual', description: 'Conhecimento, curiosidade e repertório.', icon: '⌁', color: '#efbd22' },
  { id: 'social', name: 'Social', description: 'Conexões, presença e comunidade.', icon: '○', color: '#43c879' },
  { id: 'relationship', name: 'Relacionamento', description: 'Parceria, intimidade e construção a dois.', icon: '♡', color: '#15b9ac' },
  { id: 'family', name: 'Família', description: 'Laços, cuidado e história compartilhada.', icon: '⌂', color: '#4f8aff' },
  { id: 'leisure', name: 'Lazer', description: 'Descanso, prazer e espaço para viver.', icon: '☼', color: '#7769ee' },
  { id: 'health', name: 'Saúde', description: 'Corpo, energia e bem-estar.', icon: '✚', color: '#b06ae8' },
  { id: 'emotional', name: 'Emocional', description: 'Sentimentos, presença e autocuidado.', icon: '☁', color: '#ed5eaa' },
  { id: 'spiritual', name: 'Espiritual', description: 'Fé, propósito e vida interior.', icon: '☾', color: '#8b6dce' },
  { id: 'service', name: 'Servir', description: 'Generosidade, contribuição e impacto.', icon: '⌇', color: '#3fbba2' },
  { id: 'personal-development', name: 'Desenvolvimento Pessoal', description: 'Crescimento intencional e evolução.', icon: '↗', color: '#eb4f64' }
];

export type AreaAssessment = { id: string; period: string; createdAt: string; scores: Record<string, number>; };
export type AreaRecord = { id: string; title: string; description?: string; dueDate?: string; status: 'active' | 'future' | 'done'; priority?: 'high' | 'normal'; };
export type AreaWorkspace = { note: string; diagnostic: AreaDiagnostic; goals: AreaRecord[]; futureGoals: AreaRecord[]; projects: AreaRecord[]; actions: AreaRecord[]; commitments: AreaRecord[]; };
export const emptyWorkspace = (): AreaWorkspace => ({ note: '', diagnostic: 'unknown', goals: [], futureGoals: [], projects: [], actions: [], commitments: [] });
