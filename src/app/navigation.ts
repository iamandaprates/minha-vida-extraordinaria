export type Route = 'central' | 'identity' | 'vision' | 'areas' | 'projects' | 'goals' | 'execution' | 'habits' | 'agenda' | 'studies' | 'finances' | 'library' | 'reviews' | 'cis';

export type NavItem = { label: string; icon: string; route: Route };
export type NavGroup = { label: string; items: NavItem[] };

export const navigation: NavGroup[] = [
  { label: 'MINHA VIDA', items: [{ label: 'Central', icon: '✦', route: 'central' }, { label: 'Identidade', icon: '♡', route: 'identity' }, { label: 'Visão', icon: '◉', route: 'vision' }] },
  { label: 'ORGANIZAR', items: [{ label: 'Áreas da Vida', icon: '◌', route: 'areas' }, { label: 'Projetos', icon: '□', route: 'projects' }, { label: 'Metas', icon: '↗', route: 'goals' }, { label: 'Execução', icon: '✓', route: 'execution' }] },
  { label: 'ACOMPANHAR', items: [{ label: 'Hábitos', icon: '◒', route: 'habits' }, { label: 'Agenda', icon: '□', route: 'agenda' }, { label: 'Estudos', icon: '⌁', route: 'studies' }, { label: 'Finanças', icon: '◈', route: 'finances' }] },
  { label: 'REFLETIR', items: [{ label: 'Biblioteca', icon: '▤', route: 'library' }, { label: 'Revisões', icon: '↺', route: 'reviews' }, { label: 'Método CIS', icon: '◇', route: 'cis' }] }
];
