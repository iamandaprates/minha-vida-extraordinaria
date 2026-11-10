import { Crown, Moon, Sun } from 'lucide-react';
import { Link, NavLink } from 'react-router-dom';
import { useMive } from '../store/useMive';
import { cn } from '../ui';
import { AvatarImage } from './Avatar';
import { Logo } from './Logo';
import { guides } from './nav';
import { RegisterMenu } from './RegisterMenu';
import { SpotifyMini } from './SpotifyMini';

const iconButton = 'grid h-11 w-11 place-items-center rounded-full border border-line/10 bg-white/60 text-ink transition hover:border-magenta/40 hover:text-magenta dark:bg-white/5';

export function ThemeToggle() {
  const theme = useMive(state => state.settings.theme);
  const toggle = useMive(state => state.toggleTheme);
  return <button type="button" onClick={toggle} className={iconButton} aria-label={theme === 'dark' ? 'Usar tema claro' : 'Usar tema escuro'}>{theme === 'dark' ? <Sun size={18} strokeWidth={1.75} /> : <Moon size={18} strokeWidth={1.75} />}</button>;
}

export function EuSouButton({ onClick, compact = false }: { onClick: () => void; compact?: boolean }) {
  return <button type="button" onClick={onClick} className={cn('relative flex h-11 items-center gap-2 rounded-full border border-magenta/30 bg-rosa/70 font-semibold text-violeta transition hover:border-magenta dark:bg-magenta/10 dark:text-lilas', compact ? 'w-11 justify-center' : 'px-4 text-sm')} aria-label="Eu Sou">
    <Crown size={17} strokeWidth={1.75} className="text-magenta" />{!compact && 'Eu Sou'}
    <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-ciano dark:border-violeta" aria-hidden="true" />
  </button>;
}

/** Desktop (>768px): cápsula de vidro flutuante fixa no topo. */
export function TopNav({ onEuSou }: { onEuSou: () => void }) {
  return <header className="pt-safe fixed inset-x-0 top-0 z-40 hidden px-4 pt-4 md:block">
    <nav aria-label="Navegação principal" className="glass mx-auto flex h-16 max-w-[1440px] items-center gap-3 rounded-full pl-5 pr-2">
      <Link to="/" aria-label="Mive · Início" className="shrink-0 rounded-full pr-2"><Logo /></Link>
      <div className="flex min-w-0 flex-1 justify-center gap-1">
        {guides.map(guide => <NavLink key={guide.path} to={guide.path} end={guide.path === '/'} title={guide.label} className={({ isActive }) => cn('flex h-11 shrink-0 items-center gap-2 rounded-full px-3 text-sm font-semibold transition', isActive ? 'bg-grad-magenta text-white shadow-magenta' : 'text-ink-soft hover:bg-rosa/70 hover:text-magenta dark:hover:bg-white/5')}>
          <guide.icon size={17} strokeWidth={1.75} /><span className="hidden 2xl:inline">{guide.label}</span><span className="hidden xl:inline 2xl:hidden">{guide.short}</span>
        </NavLink>)}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <RegisterMenu compact />
        <SpotifyMini compact />
        <EuSouButton onClick={onEuSou} compact />
        <ThemeToggle />
        <Link to="/configuracoes" aria-label="Perfil e configurações" className="rounded-full"><AvatarImage size={44} /></Link>
      </div>
    </nav>
  </header>;
}
