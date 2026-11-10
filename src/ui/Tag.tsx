import type { PropsWithChildren } from 'react';
import { cn } from './cn';

type Tone = 'magenta' | 'ciano' | 'lilas' | 'neutral';
const tones: Record<Tone, string> = {
  magenta: 'bg-magenta/10 text-magenta',
  ciano: 'bg-ciano/15 text-[#007e8c] dark:text-ciano',
  lilas: 'bg-lilas/25 text-violeta dark:text-lilas',
  neutral: 'bg-line/5 text-ink-soft dark:bg-white/10'
};
export function Tag({ tone = 'neutral', className, children }: PropsWithChildren<{ tone?: Tone; className?: string }>) {
  return <span className={cn('inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold', tones[tone], className)}>{children}</span>;
}
