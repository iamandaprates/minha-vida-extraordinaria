import type { Goal, Habit, MiveData, Project, Task } from '../types';

/**
 * Plano real da Mands, trazido da versão anterior (branch mive-v1, Método CIS).
 * Só estrutura e próximas ações: nenhum registro de execução é inventado.
 */
export function seedPlan(now = new Date()): Pick<MiveData, 'projects' | 'goals' | 'tasks' | 'habits'> {
  const at = now.toISOString();
  const milestone = (id: string, title: string) => ({ id, title });
  const projects: Project[] = [
    { id: 'project-cavu', name: 'Projeto CAVU', areaId: 'profissional', tag: 'CAVU', status: 'active', createdAt: at },
    { id: 'project-prf', name: 'Concurso PRF', areaId: 'intelectual', status: 'active', createdAt: at },
    { id: 'project-ingles', name: 'Fluência em Inglês', areaId: 'intelectual', status: 'active', createdAt: at }
  ];
  const goals: Goal[] = [
    { id: 'goal-shape', title: 'Shape dos Sonhos · 65 kg', areaId: 'saude', why: 'Marcos: 85 kg → 70 kg → 65 kg', milestones: [milestone('m-shape-70', 'Chegar a 70 kg'), milestone('m-shape-65', 'Chegar a 65 kg')], createdAt: at },
    { id: 'goal-cavu', title: 'Lançamento e Primeiras Vendas CAVU', areaId: 'profissional', projectId: 'project-cavu', why: 'Moda fitness · marca própria', milestones: [milestone('m-cavu-launch', 'Lançar a CAVU'), milestone('m-cavu-sale', 'Fazer a primeira venda')], createdAt: at },
    { id: 'goal-prf', title: 'Aprovação Concurso PRF', areaId: 'intelectual', projectId: 'project-prf', why: 'Agente Administrativo', milestones: [milestone('m-prf-b1', 'Fechar o Bloco 1')], createdAt: at },
    { id: 'goal-finance', title: 'Estruturação Financeira & Apartamento Vista Mar', areaId: 'financeiro', why: 'Meta pessoal R$ 50 mil/mês · visão empresarial R$ 20M/ano', milestones: [], createdAt: at },
    { id: 'goal-english', title: 'Fluência em Inglês', areaId: 'intelectual', projectId: 'project-ingles', why: 'Resgate do curso pago, conversação diária e flashcards', milestones: [], createdAt: at }
  ];
  const task = (id: string, title: string, projectId: string, estimateMin?: number): Task => ({ id, title, projectId, estimateMin, createdAt: at });
  const tasks: Task[] = [
    task('task-cavu-fornecedores', 'Enviar mensagem aos fornecedores da CAVU', 'project-cavu', 20),
    task('task-cavu-tecidos', 'Definir os tecidos da coleção CAVU', 'project-cavu'),
    task('task-cavu-modelagem', 'Fechar a modelagem das peças CAVU', 'project-cavu'),
    task('task-prf-questoes', 'Resolver 30 questões de Direito Administrativo', 'project-prf', 50),
    task('task-ingles-curso', 'Resgatar o acesso ao curso de inglês pago', 'project-ingles', 15)
  ];
  const habits: Habit[] = [
    { id: 'habit-treino', title: 'Treino', areaId: 'saude' },
    { id: 'habit-agua', title: 'Hidratação · 3 litros', areaId: 'saude' },
    { id: 'habit-alimentacao', title: 'Alimentação limpa', areaId: 'saude' },
    { id: 'habit-prf', title: 'Bloco de estudos PRF', areaId: 'intelectual' },
    { id: 'habit-ingles', title: 'Conversação em inglês', areaId: 'intelectual' }
  ];
  return { projects, goals, tasks, habits };
}
