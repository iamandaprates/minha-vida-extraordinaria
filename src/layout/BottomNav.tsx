import { Crown, Ellipsis, Settings } from 'lucide-react';
import { useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Sheet, cn } from '../ui';
import { AvatarImage } from './Avatar';
import { Logo } from './Logo';
import { guides, mobileTabs } from './nav';
import { RegisterMenu } from './RegisterMenu';
import { SpotifyMini } from './SpotifyMini';
import { TimerBadge } from './TimerBadge';
import { ThemeToggle } from './TopNav';

/** Celular (≤768px): topo compacto + barra inferior de 5 itens + folha "Mais". */
export function MobileNav({ onEuSou }: { onEuSou: () => void }) {
  const [more, setMore] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const extra = guides.filter(guide => !mobileTabs.includes(guide.path));
  const inMore = !mobileTabs.includes(location.pathname);
  return <>
    <header className="pt-safe fixed inset-x-0 top-0 z-40 px-3 pt-3 md:hidden">
      <div className="glass flex h-14 items-center justify-between rounded-full pl-4 pr-1.5">
        <Link to="/" aria-label="Mive · Início"><Logo compact /></Link>
        <div className="flex items-center gap-1.5"><TimerBadge /><SpotifyMini compact /><RegisterMenu compact /></div>
      </div>
    </header>
    <nav aria-label="Navegação" className="pb-safe fixed inset-x-0 bottom-0 z-40 px-3 md:hidden">
      <div className="glass grid h-[68px] grid-cols-5 items-center rounded-[28px] px-1">
        {guides.filter(guide => mobileTabs.includes(guide.path)).map(guide => <NavLink key={guide.path} to={guide.path} end={guide.path === '/'} className={({ isActive }) => cn('grid h-14 place-items-center content-center gap-1 rounded-2xl text-[11px] font-semibold transition', isActive ? 'text-magenta' : 'text-muted')}>
          {({ isActive }) => <><guide.icon size={22} strokeWidth={isActive ? 2 : 1.75} /><span>{guide.short}</span></>}
        </NavLink>)}
        <button type="button" onClick={() => setMore(true)} className={cn('grid h-14 place-items-center content-center gap-1 rounded-2xl text-[11px] font-semibold', inMore ? 'text-magenta' : 'text-muted')} aria-label="Mais opções"><Ellipsis size={22} strokeWidth={1.75} /><span>Mais</span></button>
      </div>
    </nav>
    <Sheet open={more} onClose={() => setMore(false)} title="Mais" eyebrow="Mive" side="bottom">
      <div className="grid gap-2">
        {extra.map(guide => <button key={guide.path} type="button" onClick={() => { setMore(false); navigate(guide.path); }} className={cn('flex h-14 items-center gap-3 rounded-2xl border border-line/10 px-4 text-left font-semibold', location.pathname === guide.path ? 'border-magenta/40 text-magenta' : 'text-ink')}><guide.icon size={20} strokeWidth={1.75} className="text-magenta" />{guide.label}</button>)}
        <button type="button" onClick={() => { setMore(false); onEuSou(); }} className="flex h-14 items-center gap-3 rounded-2xl border border-line/10 px-4 text-left font-semibold text-ink"><Crown size={20} strokeWidth={1.75} className="text-magenta" />Eu Sou</button>
        <button type="button" onClick={() => { setMore(false); navigate('/configuracoes'); }} className="flex h-14 items-center gap-3 rounded-2xl border border-line/10 px-4 text-left font-semibold text-ink"><Settings size={20} strokeWidth={1.75} className="text-magenta" />Configurações</button>
      </div>
      <div className="mt-5 flex items-center gap-3 rounded-2xl border border-line/10 p-3"><AvatarImage size={44} /><span className="flex-1 text-sm font-semibold">Tema</span><ThemeToggle /></div>
    </Sheet>
  </>;
}
