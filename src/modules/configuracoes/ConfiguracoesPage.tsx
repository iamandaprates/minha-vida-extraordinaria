import { Download, HardDrive, Upload } from 'lucide-react';
import { useRef, useState } from 'react';
import { spotifyEmbedUrl } from '../../layout/SpotifyMini';
import { AvatarUpload } from '../../layout/Avatar';
import { downloadBackup, readBackup } from '../../store/backup';
import { selectData, useMive } from '../../store/useMive';
import type { MiveData } from '../../types';
import { Button, GlassCard, Input, Modal, Tabs } from '../../ui';
import { Page, PageHeader } from '../GuidePage';

export function ConfiguracoesPage() {
  const state = useMive();
  const [name, setName] = useState(state.profile?.name ?? '');
  const [spotify, setSpotify] = useState(state.settings.spotifyUrl ?? '');
  const [pending, setPending] = useState<MiveData | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const file = useRef<HTMLInputElement>(null);
  const spotifyValid = !spotify.trim() || Boolean(spotifyEmbedUrl(spotify));
  const pick = async (picked?: File) => { if (!picked) return; setError(''); setMessage(''); try { setPending(await readBackup(picked)); } catch (reason) { setError(reason instanceof Error ? reason.message : 'Não foi possível ler o backup.'); } };

  return <Page>
    <PageHeader eyebrow="Perfil" title="Configurações" subtitle="Seu perfil, a aparência da Mive e seus dados." />
    <div className="grid gap-5 lg:grid-cols-2">
      <GlassCard className="grid gap-5">
        <h2 className="text-xl">Perfil</h2>
        <AvatarUpload size={104} />
        <form className="grid gap-3" onSubmit={event => { event.preventDefault(); if (name.trim()) { state.setProfile({ name: name.trim() }); setMessage('Perfil salvo.'); } }}>
          <Input label="Como você quer ser chamada?" value={name} onChange={event => setName(event.target.value)} autoComplete="given-name" />
          <Button type="submit" className="justify-self-start">Salvar nome</Button>
        </form>
      </GlassCard>
      <GlassCard className="grid content-start gap-5">
        <h2 className="text-xl">Aparência e música</h2>
        <div className="grid gap-2"><span className="text-sm font-semibold">Tema</span><Tabs label="Tema" value={state.settings.theme} onChange={theme => state.updateSettings({ theme })} options={[{ value: 'light', label: 'Claro' }, { value: 'dark', label: 'Dark Luxury' }]} /></div>
        <form className="grid gap-3" onSubmit={event => { event.preventDefault(); if (spotifyValid) { state.updateSettings({ spotifyUrl: spotify.trim() || undefined }); setMessage('Playlist salva no mini-player.'); } }}>
          <Input label="Playlist do Spotify" value={spotify} onChange={event => setSpotify(event.target.value)} placeholder="https://open.spotify.com/playlist/..." error={spotifyValid ? undefined : 'Cole um link de playlist, álbum ou faixa do Spotify.'} hint="Aparece no mini-player do topo." />
          <Button type="submit" variant="secondary" className="justify-self-start">Salvar playlist</Button>
        </form>
      </GlassCard>
      <GlassCard className="grid gap-4 lg:col-span-2">
        <div className="flex items-start gap-3"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-rosa text-magenta dark:bg-magenta/15"><HardDrive size={20} strokeWidth={1.75} /></span><div><h2 className="text-xl">Seus dados</h2><p className="mt-1 text-sm text-ink-soft">Tudo fica salvo neste navegador e funciona offline. Faça um backup de vez em quando: é o seu seguro.</p></div></div>
        <div className="flex flex-wrap gap-3">
          <Button onClick={() => { downloadBackup(selectData(useMive.getState())); setMessage('Backup baixado.'); }}><Download size={18} strokeWidth={1.75} /> Exportar backup JSON</Button>
          <Button variant="secondary" onClick={() => file.current?.click()}><Upload size={18} strokeWidth={1.75} /> Importar backup</Button>
          <input ref={file} type="file" accept="application/json,.json" className="sr-only" tabIndex={-1} onChange={event => { void pick(event.target.files?.[0]); event.target.value = ''; }} />
        </div>
        <p className="text-sm text-muted">{state.behaviorLog.length} registros de execução guardados.</p>
      </GlassCard>
    </div>
    {(message || error) && <p role="status" className="mt-5 text-sm font-semibold text-magenta">{error || message}</p>}
    <Modal open={Boolean(pending)} onClose={() => setPending(null)} title="Substituir seus dados?" eyebrow="Importar backup">
      <p className="text-ink-soft">Os dados atuais deste navegador serão trocados pelos do backup{pending?.profile?.name ? ` de ${pending.profile.name}` : ''}, com {pending?.behaviorLog.length ?? 0} registros. Exporte um backup antes, se quiser guardar os atuais.</p>
      <div className="mt-6 flex flex-wrap gap-3"><Button onClick={() => { if (pending) { state.replaceAll(pending); setMessage('Backup importado.'); } setPending(null); }}>Substituir dados</Button><Button variant="ghost" onClick={() => setPending(null)}>Cancelar</Button></div>
    </Modal>
  </Page>;
}
