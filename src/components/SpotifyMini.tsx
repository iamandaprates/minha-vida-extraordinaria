import { ExternalLink, Music2, Pause, Play, Plus } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { moodLabels } from '../domain/catalog';
import type { Playlist } from '../domain/models';
import { useLife } from '../state/LifeStore';
import { Icon } from './icons';

/**
 * Mini player built on the official Spotify Embed iFrame API.
 * The API script loads only on the first interaction. Playlists are records in the
 * LifeStore; the playing state is runtime state in the LifeStore, shared with the page.
 */
interface EmbedController { loadUri(uri: string): void; play(): void; togglePlay(): void; pause(): void; addListener(event: 'ready' | 'playback_update', callback: (event: { data: { isPaused: boolean } }) => void): void; }
interface IFrameAPI { createController(element: HTMLElement, options: { uri: string; width?: string | number; height?: number }, callback: (controller: EmbedController) => void): void; }
declare global { interface Window { onSpotifyIframeApiReady?: (api: IFrameAPI) => void; } }

let apiPromise: Promise<IFrameAPI> | undefined;
function loadSpotify(): Promise<IFrameAPI> {
  apiPromise ??= new Promise((resolve, reject) => {
    window.onSpotifyIframeApiReady = api => resolve(api);
    const script = document.createElement('script');
    script.src = 'https://open.spotify.com/embed/iframe-api/v1';
    script.async = true;
    script.onerror = () => { apiPromise = undefined; reject(new Error('Spotify indisponível')); };
    document.body.appendChild(script);
  });
  return apiPromise;
}
/** Accepts a Spotify link (open.spotify.com/playlist/ID) or URI (spotify:playlist:ID). */
export function toSpotifyUri(input: string): string | undefined {
  const value = input.trim();
  if (/^spotify:(playlist|album|track|show):[A-Za-z0-9]+$/.test(value)) return value;
  const match = value.match(/open\.spotify\.com\/(?:intl-[a-z-]+\/)?(playlist|album|track|show)\/([A-Za-z0-9]+)/);
  return match ? `spotify:${match[1]}:${match[2]}` : undefined;
}
const openUrl = (uri: string) => { const [, type, id] = uri.split(':'); return `https://open.spotify.com/${type}/${id}`; };

export function SpotifyMini({ compact = false }: { compact?: boolean }) {
  const { snapshot, player, setPlayer, addPlaylist } = useLife();
  const [open, setOpen] = useState(false);
  const [failed, setFailed] = useState(false);
  const [link, setLink] = useState('');
  const host = useRef<HTMLDivElement>(null);
  const controller = useRef<EmbedController | null>(null);
  const loadedUri = useRef<string | undefined>(undefined);
  const playlists = snapshot.playlists.slice().sort((a, b) => a.position - b.position);
  const current = playlists.find(item => item.id === player.playlistId) ?? playlists[0];

  const ensure = async (uri: string) => {
    if (controller.current) { if (loadedUri.current !== uri) { controller.current.loadUri(uri); loadedUri.current = uri; } return controller.current; }
    try {
      const api = await loadSpotify();
      return await new Promise<EmbedController>(resolve => api.createController(host.current!, { uri, width: '100%', height: 152 }, created => {
        controller.current = created; loadedUri.current = uri;
        created.addListener('playback_update', event => setPlayer({ playing: !event.data.isPaused }));
        resolve(created);
      }));
    } catch { setFailed(true); return null; }
  };
  const toggle = async () => { if (!current) return; const embed = await ensure(current.spotifyUri); if (embed) embed.togglePlay(); };
  const choose = async (playlist: Playlist) => { setPlayer({ playlistId: playlist.id }); const embed = await ensure(playlist.spotifyUri); embed?.play(); };
  useEffect(() => { if (open && current && !controller.current && !failed) void ensure(current.spotifyUri); }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const uri = toSpotifyUri(link);

  return <div className={`spotify ${compact ? 'is-compact' : ''}`}>
    <div className="spotify-pill">
      <button type="button" className="spotify-play" onClick={() => void toggle()} aria-label={player.playing ? 'Pausar música' : 'Tocar música'} disabled={!current}><Icon as={player.playing ? Pause : Play} size={14} /></button>
      <button type="button" className="spotify-label" onClick={() => setOpen(!open)} aria-expanded={open} aria-label="Abrir playlists"><Icon as={Music2} size={15} />{!compact && <span><b>{current?.name ?? 'Spotify'}</b><small>{current ? moodLabels[current.mood] : 'Sem playlist'}</small></span>}{player.playing && <i className="eq" aria-hidden="true"><em /><em /><em /></i>}</button>
    </div>
    <div className={`spotify-panel ${open ? 'is-open' : ''}`} role="dialog" aria-label="Spotify" aria-hidden={!open}>
      <span className="label">TRILHA DO MOMENTO</span>
      <div className="chip-row">{playlists.map(playlist => <button key={playlist.id} type="button" className={`chip ${current?.id === playlist.id ? 'selected' : ''}`} onClick={() => void choose(playlist)}>{moodLabels[playlist.mood]} · {playlist.name}</button>)}</div>
      <div className="spotify-embed" ref={host} />
      {failed && current && <p className="fine-print">Não foi possível carregar o player aqui. <a href={openUrl(current.spotifyUri)} target="_blank" rel="noreferrer">Abrir no Spotify <Icon as={ExternalLink} size={12} /></a></p>}
      <form className="spotify-add" onSubmit={event => { event.preventDefault(); if (uri) { addPlaylist('Minha playlist', uri, 'focus'); setLink(''); } }}>
        <input value={link} onChange={event => setLink(event.target.value)} placeholder="Colar link de playlist do Spotify" aria-label="Link de playlist do Spotify" />
        <button type="submit" className="icon-chip" disabled={!uri} aria-label="Adicionar playlist"><Icon as={Plus} size={15} /></button>
      </form>
    </div>
  </div>;
}
