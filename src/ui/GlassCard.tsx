import type { HTMLAttributes, PropsWithChildren } from 'react';
import { cn } from './cn';

/** Cartão de vidro lapidado. `tone="rosa"` usa a superfície Rosa Nuvem. */
export function GlassCard({ className, tone = 'glass', padded = true, children, ...props }: PropsWithChildren<HTMLAttributes<HTMLDivElement> & { tone?: 'glass' | 'rosa' | 'strong'; padded?: boolean }>) {
  return <div className={cn('rounded-3xl', tone === 'glass' && 'glass', tone === 'strong' && 'glass-strong', tone === 'rosa' && 'bg-rosa/80 border border-white/70 shadow-glass dark:bg-violeta/40 dark:border-lilas/20', padded && 'p-5 sm:p-6', className)} {...props}>{children}</div>;
}
