import { navigation, type NavItem, type Route, type RouteParams } from '../app/navigation';

type SidebarProps = { route: Route; areaId?: string; onNavigate: (route: Route, params?: RouteParams) => void; profileName: string; profileCaption: string };

const initials = (name: string) => name.split(' ').filter(Boolean).slice(0, 2).map(part => part[0]?.toUpperCase()).join('');
const isActive = (item: NavItem, route: Route, areaId?: string) => item.route === route && (item.params?.areaId ? item.params.areaId === areaId : !(item.route === 'areas' && areaId === 'health'));

export function Sidebar({ route, areaId, onNavigate, profileName, profileCaption }: SidebarProps) {
  return <aside className="sidebar">
    <div className="brand"><span className="brand-mark">m</span><span>minha vida<br /><b>extraordinária</b></span></div>
    <nav aria-label="Navegação principal" className="sidebar-nav">{navigation.map(group => <div className="nav-group" key={group.label}><p>{group.label}</p>{group.items.map(item => { const active = isActive(item, route, areaId); return <button key={item.label} type="button" className={`nav-item ${active ? 'active' : ''}`} onClick={() => onNavigate(item.route, item.params)} aria-current={active ? 'page' : undefined}><span>{item.icon}</span>{item.label}</button>; })}</div>)}</nav>
    <div className="profile"><span>{initials(profileName)}</span><div><b>{profileName}</b><small>{profileCaption}</small></div></div>
  </aside>;
}
