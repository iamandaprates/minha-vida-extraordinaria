import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import type { PropsWithChildren, ReactNode } from 'react';
import { GlassCard } from '../ui';

/** Cabeçalho padrão das guias. */
export function PageHeader({ eyebrow, title, subtitle, action }: { eyebrow: string; title: ReactNode; subtitle?: string; action?: ReactNode }) {
  return <header className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
    <div><p className="eyebrow">{eyebrow}</p><h1 className="mt-2 text-[32px] leading-[1.08] sm:text-[44px]">{title}</h1>{subtitle && <p className="mt-2 max-w-2xl text-base text-ink-soft">{subtitle}</p>}</div>
    {action}
  </header>;
}

/** Estado vazio bonito e encorajador. */
export function EmptyState({ icon: Icon, title, children }: PropsWithChildren<{ icon: LucideIcon; title: string }>) {
  return <GlassCard className="grid justify-items-center gap-3 py-12 text-center">
    <span className="grid h-16 w-16 place-items-center rounded-3xl bg-rosa text-magenta shadow-glass dark:bg-magenta/15"><Icon size={28} strokeWidth={1.5} /></span>
    <h2 className="text-xl">{title}</h2>
    <div className="max-w-md text-[15px] text-ink-soft">{children}</div>
  </GlassCard>;
}

export const pageMotion = { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } } as const;
export const Page = ({ children }: PropsWithChildren) => <motion.div {...pageMotion}>{children}</motion.div>;
