import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { areaTools } from '../../data/areaTools';
import { areas } from '../../data/areas';
import { useMive } from '../../store/useMive';
import { GlassCard } from '../../ui';
import { Page, PageHeader } from '../GuidePage';
import { MaasPanel } from './MaasPanel';

export function AreasPage() {
  const state = useMive();
  const latest = [...state.maas].sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt)).at(-1);
  return <Page>
    <PageHeader eyebrow="Áreas da Vida" title="Uma vida inteira, não só o trabalho" subtitle="Cada área tem a sua ferramenta. Escolha uma e dê o próximo passo." />
    <div className="mb-6"><MaasPanel /></div>
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">{areas.map(area => {
      const score = latest?.scores[area.id];
      const goals = state.goals.filter(goal => goal.areaId === area.id).length;
      return <Link key={area.id} to={`/areas/${area.id}`} className="group block rounded-3xl">
        <GlassCard padded={false} className="grid h-full gap-3 p-4 transition group-hover:-translate-y-0.5 group-hover:shadow-lift sm:p-5">
          <div className="flex items-start justify-between">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-rosa text-magenta dark:bg-magenta/15"><area.icon size={22} strokeWidth={1.5} /></span>
            {score !== undefined && <span className="text-right"><span className="block text-xl font-bold tabular-nums leading-none">{score}</span><span className="text-[11px] font-medium text-muted">MAAS</span></span>}
          </div>
          <div><h2 className="text-base font-semibold leading-tight sm:text-lg">{area.name}</h2><p className="mt-1 line-clamp-2 text-xs text-ink-soft sm:text-sm">{areaTools[area.id].tagline}</p></div>
          <p className="mt-auto flex items-center justify-between text-xs font-semibold text-magenta"><span>{goals ? `${goals} ${goals === 1 ? 'meta' : 'metas'}` : 'Abrir'}</span><ArrowRight size={16} strokeWidth={1.75} className="transition group-hover:translate-x-1" /></p>
        </GlassCard>
      </Link>;
    })}</div>
  </Page>;
}
