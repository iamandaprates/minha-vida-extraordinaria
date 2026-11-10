import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { useState } from 'react';
import { AvatarUpload } from '../../layout/Avatar';
import { Waves } from '../../layout/Waves';
import { firstName } from '../../lib/greeting';
import { useMive } from '../../store/useMive';
import { Button, GlassCard, Input } from '../../ui';

/** Boas-vindas em 2 passos: nome e foto. */
export function Onboarding() {
  const profile = useMive(state => state.profile);
  const setProfile = useMive(state => state.setProfile);
  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState(profile?.name ?? '');
  const finish = () => setProfile({ onboardedAt: new Date().toISOString() });
  return <main className="relative grid min-h-[100dvh] place-items-center overflow-x-hidden px-4 py-10">
    <Waves />
    <div className="w-full max-w-md text-center">
      <img src="/logo.png" alt="" className="mx-auto h-24 w-auto drop-shadow-[0_12px_24px_rgba(243,25,145,0.35)]" />
      <h1 className="mt-4 text-5xl">Mive</h1>
      <p className="mt-2 text-xs font-semibold uppercase tracking-[0.3em] text-ink-soft">Sistema da sua vida extraordinária</p>
      <AnimatePresence mode="wait">
        <motion.div key={step} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.3 }}>
          <GlassCard tone="strong" className="mt-8 grid gap-5 text-left">
            {step === 1 ? <form className="grid gap-5" onSubmit={event => { event.preventDefault(); if (name.trim()) { setProfile({ name: name.trim() }); setStep(2); } }}>
              <div><p className="eyebrow">Passo 1 de 2</p><h2 className="mt-1 text-2xl">Sua vida, integrada.</h2><p className="mt-1 text-ink-soft">Como você quer ser chamada?</p></div>
              <Input label="Seu nome" value={name} onChange={event => setName(event.target.value)} placeholder="Ex.: Mands" autoFocus autoComplete="given-name" />
              <Button type="submit" size="lg" disabled={!name.trim()}>Continuar <ArrowRight size={18} strokeWidth={1.75} /></Button>
            </form> : <div className="grid gap-5">
              <div><p className="eyebrow">Passo 2 de 2</p><h2 className="mt-1 text-2xl">Prazer, {firstName(profile?.name ?? name)}!</h2><p className="mt-1 text-ink-soft">Coloque sua foto. Ela fica só neste aparelho.</p></div>
              <AvatarUpload size={112} />
              <Button size="lg" onClick={finish}>{profile?.photo ? 'Começar' : 'Começar sem foto'} <ArrowRight size={18} strokeWidth={1.75} /></Button>
              <button type="button" className="text-sm font-semibold text-muted hover:text-magenta" onClick={() => setStep(1)}>Voltar</button>
            </div>}
          </GlassCard>
        </motion.div>
      </AnimatePresence>
    </div>
  </main>;
}
