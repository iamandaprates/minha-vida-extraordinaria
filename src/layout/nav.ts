import { BookOpen, CalendarDays, Layers, Lightbulb, House, Target, TrendingUp, type LucideIcon } from 'lucide-react';

/** As 7 guias oficiais da Mive. */
export interface Guide { path: string; label: string; short: string; icon: LucideIcon; phase: number; }
export const guides: Guide[] = [
  { path: '/', label: 'Início', short: 'Início', icon: House, phase: 2 },
  { path: '/agenda', label: 'Agenda', short: 'Agenda', icon: CalendarDays, phase: 3 },
  { path: '/areas', label: 'Áreas da Vida', short: 'Áreas', icon: Layers, phase: 4 },
  { path: '/projetos', label: 'Projetos & Metas', short: 'Projetos', icon: Target, phase: 3 },
  { path: '/estudos', label: 'Estudos', short: 'Estudos', icon: BookOpen, phase: 5 },
  { path: '/ideias', label: 'Ideias', short: 'Ideias', icon: Lightbulb, phase: 5 },
  { path: '/evolucao', label: 'Evolução', short: 'Evolução', icon: TrendingUp, phase: 6 }
];
/** Barra inferior do celular: 4 guias + "Mais". */
export const mobileTabs = ['/', '/agenda', '/areas', '/evolucao'];
