import { Crown, Menu, Moon, Sun } from 'lucide-react';
import { useState } from 'react';
import { mobilePrimary, navigation, type Route } from '../app/navigation';
import { TimerBadge } from './FocusTimer';
import { Icon } from './icons';
import { Logo } from './Logo';
import { RegisterMenu } from './RegisterMenu';
import { SpotifyMini } from './SpotifyMini';
import { Drawer } from './ui';

interface TopNavProps { route: Route; onNavigate: (route: Route) => void; onIdentity: () => void; theme: 'light' | 'dark'; onToggleTheme: () => void; profileName: string; profileCaption: string; ready: boolean; }
const initials = (name: string) => name.split(' ').filter(Boolean).slice(0, 2).map(part => part[0]?.toUpperCase()).join('');

/** Floating glass pill on desktop; compact top bar, bottom bar and glass drawer on mobile. */
export function TopNav({ route, onNavigate, onIdentity, theme, onToggleTheme, profileName, profileCaption, ready }: TopNavProps) {
  const [drawer, setDrawer] = useState(false);
  const go = (next: Route) => { setDrawer(false); onNavigate(next); };
  const themeButton = <button type="button" className="nav-icon" onClick={onToggleTheme} aria-label={theme === 'dark' ? 'Usar tema claro' : 'Usar tema escuro'}><Icon as={theme === 'dark' ? Sun : Moon} size={17} /></button>;
  const identityButton = (label = true) => <button type="button" className="identity-button" onClick={onIdentity}><Icon as={Crown} size={15} />{label && <span>Eu Sou</span>}<i className="identity-badge" aria-hidden="true" /></button>;
  return <>
    <header className="topnav">
      <nav className="topnav-pill" aria-label="Navegação principal">
        <button type="button" className="topnav-logo" onClick={() => go('inicio')} aria-label="Mive · Início"><Logo /></button>
        <div className="topnav-tabs">{navigation.map(item => <button key={item.route} type="button" className={`tab ${route === item.route ? 'active' : ''}`} onClick={() => go(item.route)} aria-current={route === item.route ? 'page' : undefined} title={item.label}><Icon as={item.icon} size={16} /><span>{item.label}</span></button>)}</div>
        <div className="topnav-actions">
          <TimerBadge onClick={() => go('inicio')} />
          {ready && <RegisterMenu />}
          {ready && <SpotifyMini />}
          {identityButton()}
          {themeButton}
          <span className="avatar" title={`${profileName} · ${profileCaption}`}>{initials(profileName)}</span>
        </div>
      </nav>
      <div className="topnav-mobile">
        <button type="button" className="topnav-logo" onClick={() => go('inicio')} aria-label="Mive · Início"><Logo /></button>
        <div className="topnav-actions"><TimerBadge onClick={() => go('inicio')} />{ready && <SpotifyMini compact />}{identityButton(false)}{ready && <RegisterMenu compact />}</div>
      </div>
    </header>
    <nav className="bottombar" aria-label="Navegação móvel">
      {navigation.filter(item => mobilePrimary.includes(item.route)).map(item => <button key={item.route} type="button" className={route === item.route ? 'active' : ''} onClick={() => go(item.route)} aria-current={route === item.route ? 'page' : undefined}><Icon as={item.icon} size={20} /><span>{item.short}</span></button>)}
      <button type="button" className={!mobilePrimary.includes(route) ? 'active' : ''} onClick={() => setDrawer(true)} aria-label="Mais opções"><Icon as={Menu} size={20} /><span>Mais</span></button>
    </nav>
    {drawer && <Drawer eyebrow="MIVE" title="Mais" onClose={() => setDrawer(false)}>
      <div className="drawer-nav">{navigation.filter(item => !mobilePrimary.includes(item.route)).map(item => <button key={item.route} type="button" className={route === item.route ? 'active' : ''} onClick={() => go(item.route)}><Icon as={item.icon} size={18} />{item.label}</button>)}</div>
      <div className="drawer-section drawer-row"><span className="avatar">{initials(profileName)}</span><div><b>{profileName}</b><small>{profileCaption}</small></div>{themeButton}</div>
    </Drawer>}
  </>;
}
