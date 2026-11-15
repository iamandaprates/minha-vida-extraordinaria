import { BookOpen, CalendarDays, HeartPulse, Home, Layers, Lightbulb, TrendingUp, type LucideIcon } from 'lucide-react';

/** The 7 high-action guides of Mive. */
export type Route = 'inicio' | 'agenda' | 'areas' | 'metas' | 'estudos' | 'ideias' | 'evolucao';
export type AreasTab = 'visao' | 'financas' | 'saude' | 'bemestar';
export type AgendaView = 'dia' | 'semana';
/** Optional details carried by a navigation, e.g. which area or tab to open. */
export type RouteParams = { areaId?: string; tab?: AreasTab; view?: AgendaView };

export type NavItem = { label: string; short: string; icon: LucideIcon; route: Route };
export const navigation: NavItem[] = [
  { label: 'Início', short: 'Início', icon: Home, route: 'inicio' },
  { label: 'Agenda', short: 'Agenda', icon: CalendarDays, route: 'agenda' },
  { label: 'Áreas', short: 'Áreas', icon: HeartPulse, route: 'areas' },
  { label: 'Projetos', short: 'Projetos', icon: Layers, route: 'metas' },
  { label: 'Estudos', short: 'Estudos', icon: BookOpen, route: 'estudos' },
  { label: 'Ideias', short: 'Ideias', icon: Lightbulb, route: 'ideias' },
  { label: 'Evolução', short: 'Evolução', icon: TrendingUp, route: 'evolucao' }
];
/** Shown in the mobile bottom bar; the rest live in the glass drawer. */
export const mobilePrimary: Route[] = ['inicio', 'agenda', 'metas', 'estudos'];
