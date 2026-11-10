export type Route = 'central' | 'identity' | 'vision' | 'areas' | 'projects' | 'goals' | 'execution' | 'habits' | 'agenda' | 'studies' | 'finances' | 'library' | 'reviews' | 'cis';
export type ExecutionView = 'today' | 'week' | 'all';
/** Optional details carried by a navigation, e.g. which area to open. */
export type RouteParams = { areaId?: string; view?: ExecutionView };

export type NavItem = { label: string; icon: string; route: Route; params?: RouteParams };
export type NavGroup = { label: string; items: NavItem[] };

export const navigation: NavGroup[] = [
  { label: 'MINHA VIDA', items: [{ label: 'Central', icon: '✦', route: 'central' }, { label: 'Identidade', icon: '♡', route: 'identity' }, { label: 'Visão', icon: '◉', route: 'vision' }] },
  { label: 'ORGANIZAR', items: [{ label: 'Áreas da Vida', icon: '◌', route: 'areas' }, { label: 'Metas', icon: '↗', route: 'goals' }, { label: 'Projetos', icon: '□', route: 'projects' }, { label: 'Execução', icon: '✓', route: 'execution' }] },
  { label: 'ACOMPANHAR', items: [{ label: 'Hábitos', icon: '◒', route: 'habits' }, { label: 'Agenda', icon: '▦', route: 'agenda' }, { label: 'Saúde', icon: '✚', route: 'areas', params: { areaId: 'health' } }, { label: 'Finanças', icon: '◈', route: 'finances' }, { label: 'Estudos', icon: '⌁', route: 'studies' }] },
  { label: 'REFLETIR', items: [{ label: 'Biblioteca', icon: '▤', route: 'library' }, { label: 'Revisões', icon: '↺', route: 'reviews' }, { label: 'Método CIS', icon: '◇', route: 'cis' }] }
];
