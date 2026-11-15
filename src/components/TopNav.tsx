import { ChevronLeft, ChevronRight, Crown, Menu, Moon, Sun } from 'lucide-react';
import { memo, useState } from 'react';
import { mobilePrimary, navigation, type Route } from '../app/navigation';
import { TimerBadge } from './FocusTimer';
import { Icon } from './icons';
import { Logo } from './Logo';
import { Avatar, ProfileMenu } from './ProfileMenu';
import { RegisterMenu } from './RegisterMenu';
import { SpotifyMini } from './SpotifyMini';
import { Drawer } from './ui';

interface TopNavProps { route: Route; onNavigate: (route: Route) => void; onPreload?: (route: Route) => void; onIdentity: () => void; theme: 'light' | 'dark'; onToggleTheme: () => void; profileName: string; profileCaption: string; ready: boolean; }

/** Calm, personal navigation: a stable side rail on desktop and a compact bar on small screens. */
export const TopNav = memo(function TopNav({ route, onNavigate, onPreload, onIdentity, theme, onToggleTheme, profileName, profileCaption, ready }: TopNavProps) {
  const [drawer, setDrawer] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const go = (next: Route) => { setDrawer(false); onNavigate(next); };
  const themeButton = <button type="button" className="nav-icon" onClick={onToggleTheme} aria-label={theme === 'dark' ? 'Usar tema claro' : 'Usar tema escuro'}><Icon as={theme === 'dark' ? Sun : Moon} size={17} /></button>;
  const warm = (next: Route) => ({ onPointerEnter: () => onPreload?.(next), onFocus: () => onPreload?.(next) });
  const identityButton = (label = true) => <button type="button" className="identity-button" onClick={onIdentity} aria-label="Eu Sou · identidade e evidências"><Icon as={Crown} size={15} />{label && <span>Eu Sou</span>}<i className="identity-badge" aria-hidden="true" /></button>;
  return <>
    <header className={`topnav ${collapsed ? 'is-collapsed' : ''}`}>
      <aside className="sidebar" aria-label="Navegação principal">
        <div className="sidebar-top">
          <button type="button" className="topnav-logo" onClick={() => go('inicio')} aria-label="Mive · Início"><Logo /><span className="brand-sparkle" aria-hidden="true">✦</span></button>
          <button type="button" className="sidebar-collapse nav-icon" onClick={() => setCollapsed(value => !value)} aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}><Icon as={collapsed ? ChevronRight : ChevronLeft} size={17} /></button>
        </div>
        <p className="sidebar-label">Meu espaço</p>
        <nav className="sidebar-links">{navigation.map(item => <button key={item.route} type="button" className={`tab ${route === item.route ? 'active' : ''}`} onClick={() => go(item.route)} {...warm(item.route)} aria-current={route === item.route ? 'page' : undefined} title={collapsed ? item.label : undefined}><Icon as={item.icon} size={18} /><span>{item.label}</span></button>)}</nav>
        <div className="sidebar-foot">
          {ready ? <ProfileMenu caption={profileCaption} /> : <span className="avatar" title={profileName}>{profileName.slice(0, 1)}</span>}
          <div className="sidebar-profile"><b>Meu espaço</b><small>Um passo de cada vez ✦</small></div>
          {themeButton}
        </div>
      </aside>
      <div className="desktop-context">
        <span>Seu espaço, seu ritmo.</span>
        <div className="topnav-actions"><TimerBadge onClick={() => go('inicio')} />{ready && <RegisterMenu />}{ready && <SpotifyMini />}{identityButton()} {ready ? <ProfileMenu caption={profileCaption} /> : null}</div>
      </div>
      <div className="topnav-mobile">
        <button type="button" className="topnav-logo" onClick={() => go('inicio')} aria-label="Mive · Início"><Logo /></button>
        <div className="topnav-actions"><TimerBadge onClick={() => go('inicio')} />{ready && <SpotifyMini compact />}{identityButton(false)}{ready && <RegisterMenu compact />}</div>
      </div>
    </header>
    <nav className="bottombar" aria-label="Navegação móvel">
      {navigation.filter(item => mobilePrimary.includes(item.route)).map(item => <button key={item.route} type="button" className={route === item.route ? 'active' : ''} onClick={() => go(item.route)} {...warm(item.route)} aria-current={route === item.route ? 'page' : undefined}><Icon as={item.icon} size={20} /><span>{item.short}</span></button>)}
      <button type="button" className={!mobilePrimary.includes(route) ? 'active' : ''} onClick={() => setDrawer(true)} aria-label="Mais guias e perfil" aria-haspopup="dialog" aria-expanded={drawer}><Icon as={Menu} size={20} /><span>Mais</span></button>
    </nav>
    {drawer && <Drawer eyebrow="MIVE" title="Mais" onClose={() => setDrawer(false)}>
      <div className="drawer-nav">{navigation.filter(item => !mobilePrimary.includes(item.route)).map(item => <button key={item.route} type="button" className={route === item.route ? 'active' : ''} onClick={() => go(item.route)} aria-current={route === item.route ? 'page' : undefined}><Icon as={item.icon} size={18} />{item.label}</button>)}</div>
      <div className="drawer-section drawer-row">{ready ? <ProfileMenu caption={profileCaption} /> : <Avatar />}<div><b>{profileName}</b><small>{profileCaption}</small></div>{themeButton}</div>
    </Drawer>}
  </>;
});
