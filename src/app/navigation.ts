export type NavItem = { label: string; icon: string; active?: boolean };
export type NavGroup = { label: string; items: NavItem[] };
export const navigation: NavGroup[] = [
  { label: 'MINHA VIDA', items: [{ label: 'Central', icon: '✦', active: true }, { label: 'Identidade', icon: '♡' }, { label: 'Visão', icon: '◉' }] },
  { label: 'ORGANIZAR', items: [{ label: 'Áreas da Vida', icon: '◌' }, { label: 'Projetos', icon: '□' }, { label: 'Metas', icon: '↗' }, { label: 'Execução', icon: '✓' }] },
  { label: 'ACOMPANHAR', items: [{ label: 'Hábitos', icon: '◒' }, { label: 'Agenda', icon: '□' }, { label: 'Estudos', icon: '⌁' }, { label: 'Finanças', icon: '◈' }] },
  { label: 'REFLETIR', items: [{ label: 'Biblioteca', icon: '▤' }, { label: 'Revisões', icon: '↺' }] }
];
