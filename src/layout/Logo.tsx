import { cn } from '../ui';

/** Borboleta cujas linhas formam um M + nome em Sora Bold + badge luminoso de status. */
export function Logo({ compact = false, showStatus = true, className }: { compact?: boolean; showStatus?: boolean; className?: string }) {
  return <span className={cn('relative inline-flex items-center gap-2', className)}>
    <img src="/logo.png" alt="" width={compact ? 34 : 40} height={compact ? 24 : 28} className={cn('object-contain', compact ? 'h-6 w-[34px]' : 'h-7 w-10')} />
    <span className={cn('font-bold tracking-tight text-ink', compact ? 'text-xl' : 'text-[22px]')}>Mive</span>
    {showStatus && <span className="ml-0.5 h-2 w-2 animate-pulse-glow rounded-full bg-magenta" aria-label="Online e salvo" title="Tudo salvo neste dispositivo" />}
  </span>;
}
