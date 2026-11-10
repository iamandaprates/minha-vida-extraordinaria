import { Camera } from 'lucide-react';
import { useRef, useState } from 'react';
import { firstName } from '../lib/greeting';
import { resizeImage } from '../lib/image';
import { useMive } from '../store/useMive';
import { cn } from '../ui';

export function AvatarImage({ size = 44, className }: { size?: number; className?: string }) {
  const profile = useMive(state => state.profile);
  const initial = firstName(profile?.name).slice(0, 1).toUpperCase() || 'M';
  return profile?.photo
    ? <img src={profile.photo} alt={profile.name || 'Foto de perfil'} width={size} height={size} className={cn('rounded-full object-cover ring-2 ring-white shadow-glass dark:ring-violeta', className)} style={{ width: size, height: size }} />
    : <span className={cn('grid place-items-center rounded-full bg-grad-magenta font-bold text-white', className)} style={{ width: size, height: size, fontSize: size * 0.4 }}>{initial}</span>;
}

/** Avatar com upload real: a foto é reduzida e salva localmente (IndexedDB). */
export function AvatarUpload({ size = 96 }: { size?: number }) {
  const setProfile = useMive(state => state.setProfile);
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState('');
  const pick = async (file?: File) => { if (!file) return; try { setProfile({ photo: await resizeImage(file) }); setError(''); } catch (reason) { setError(reason instanceof Error ? reason.message : 'Falha ao carregar a foto.'); } };
  return <div className="grid justify-items-center gap-2">
    <button type="button" onClick={() => input.current?.click()} className="group relative rounded-full" aria-label="Trocar foto de perfil">
      <AvatarImage size={size} />
      <span className="absolute bottom-0 right-0 grid h-9 w-9 place-items-center rounded-full border-2 border-white bg-violeta text-white shadow-glass transition group-hover:bg-magenta"><Camera size={16} strokeWidth={1.75} /></span>
    </button>
    <input ref={input} type="file" accept="image/*" className="sr-only" tabIndex={-1} onChange={event => { void pick(event.target.files?.[0]); event.target.value = ''; }} />
    {error && <p className="text-sm font-medium text-magenta">{error}</p>}
  </div>;
}
