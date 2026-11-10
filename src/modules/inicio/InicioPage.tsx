import { Sparkles } from 'lucide-react';
import { greeting, firstName } from '../../lib/greeting';
import { useMive } from '../../store/useMive';
import { GlassCard, ProgressRing } from '../../ui';
import { EmptyState, Page } from '../GuidePage';

export function InicioPage() {
  const name = firstName(useMive(state => state.profile?.name));
  const today = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());
  return <Page>
    <header className="mb-8">
      <p className="eyebrow">{today}</p>
      <p className="mt-3 text-xl font-medium text-ink-soft sm:text-2xl">{greeting()}, <span className="font-bold text-ink">{name || 'você'}</span>!</p>
      <h1 className="mt-1 text-[40px] leading-[1.05] sm:text-[56px]">Vamos executar?</h1>
      <p className="mt-2 text-base text-ink-soft">Planeje, foque e evolua em todas as áreas da sua vida.</p>
    </header>
    <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
      <EmptyState icon={Sparkles} title="Suas 3 entregas chegam na Fase 2">1 Prioridade Magna, até 2 secundárias, o botão Preciso Começar e o timer de foco. Sem vermelho, sem culpa: só execução.</EmptyState>
      <GlassCard className="grid justify-items-center gap-3 text-center">
        <ProgressRing size={170} label="Progresso do dia ainda sem entregas"><span className="text-3xl font-bold text-ink">0/3</span><span className="text-sm font-medium text-muted">Progresso do dia</span></ProgressRing>
        <p className="text-sm text-ink-soft">Disciplina é liberdade.</p>
      </GlassCard>
    </div>
  </Page>;
}
