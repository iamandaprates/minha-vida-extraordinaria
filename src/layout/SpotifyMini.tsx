import { Music2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMive } from '../store/useMive';
import { cn } from '../ui';

/** Converte um link do Spotify (playlist, álbum, faixa) na URL de embed. */
export function spotifyEmbedUrl(input?: string): string | undefined {
  const match = input?.trim().match(/open\.spotify\.com\/(?:intl-[a-z-]+\/)?(playlist|album|track|show)\/([A-Za-z0-9]+)/) ?? input?.trim().match(/^spotify:(playlist|album|track|show):([A-Za-z0-9]+)$/);
  return match ? `https://open.spotify.com/embed/${match[1]}/${match[2]}?utm_source=generator` : undefined;
}

/**
 * Mini-player: embed oficial do Spotify da playlist configurada. Sem login, o Spotify
 * controla a reprodução dentro do próprio player (play, pausa, volume do dispositivo).
 */
export function SpotifyMini({ compact = false }: { compact?: boolean }) {
  const url = spotifyEmbedUrl(useMive(state => state.settings.spotifyUrl));
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { if (open) setLoaded(true); if (!open) return; const close = (event: MouseEvent) => { if (!ref.current?.contains(event.target as Node)) setOpen(false); }; document.addEventListener('mousedown', close); return () => document.removeEventListener('mousedown', close); }, [open]);
  return <div className="relative" ref={ref}>
    <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} aria-label="Mini-player do Spotify" className={cn('flex h-11 items-center gap-2 rounded-full border border-line/10 bg-white/60 px-3 text-sm font-semibold text-ink transition hover:border-magenta/40 dark:bg-white/5', compact && 'w-11 justify-center px-0')}>
      <span className="grid h-7 w-7 place-items-center rounded-full bg-[#1DB954] text-white"><Music2 size={15} strokeWidth={1.75} /></span>
      {!compact && <span className="hidden max-w-[96px] truncate xl:inline">{url ? 'Trilha de foco' : 'Spotify'}</span>}
    </button>
    {/* O painel fica montado depois de aberto, para a música continuar ao fechar. */}
    {loaded && <div className={cn('glass-strong absolute right-0 top-14 z-50 w-[min(340px,calc(100vw-24px))] rounded-3xl p-4 transition', open ? 'visible opacity-100' : 'invisible opacity-0')}>
      <p className="eyebrow mb-3">Trilha do momento</p>
      {url ? <iframe title="Spotify" src={url} width="100%" height="152" loading="lazy" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" className="rounded-2xl border-0" />
        : <p className="text-sm text-ink-soft">Cole o link de uma playlist do Spotify em <Link to="/configuracoes" className="font-semibold text-magenta" onClick={() => setOpen(false)}>Configurações</Link> para tocar aqui.</p>}
    </div>}
  </div>;
}
