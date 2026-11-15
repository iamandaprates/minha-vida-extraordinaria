import { Camera, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useLife } from '../state/LifeStore';
import { Icon } from './icons';

/** Reads an image file and returns a square JPEG data URL of `size` pixels (keeps storage small). */
export function resizeImage(file: File, size = 256, square = true): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Não foi possível ler a imagem.'));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error('Arquivo de imagem inválido.'));
      image.onload = () => {
        const scale = square ? Math.max(size / image.width, size / image.height) : Math.min(1, size / Math.max(image.width, image.height));
        const width = square ? size : Math.round(image.width * scale); const height = square ? size : Math.round(image.height * scale);
        const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
        const context = canvas.getContext('2d'); if (!context) return reject(new Error('Canvas indisponível.'));
        const drawWidth = image.width * scale; const drawHeight = image.height * scale;
        context.drawImage(image, (width - drawWidth) / 2, (height - drawHeight) / 2, drawWidth, drawHeight);
        resolve(canvas.toDataURL('image/jpeg', 0.86));
      };
      image.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

const initials = (name: string) => name.split(' ').filter(Boolean).slice(0, 2).map(part => part[0]?.toUpperCase()).join('');

export function Avatar({ size = 40 }: { size?: number }) {
  const { snapshot, user } = useLife();
  const profile = snapshot.profiles[0];
  const name = profile?.displayName ?? user?.name ?? 'Mands';
  return profile?.photoDataUrl ? <img className="avatar" src={profile.photoDataUrl} alt={name} width={size} height={size} decoding="async" style={{ width: size, height: size }} /> : <span className="avatar" style={{ width: size, height: size }}>{initials(name)}</span>;
}

/** Profile card: photo upload (resized to 256 px and saved in the LifeStore) and display name. */
export function ProfileMenu({ caption }: { caption: string }) {
  const { snapshot, user, setProfile } = useLife();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const profile = snapshot.profiles[0];
  const [name, setName] = useState(profile?.displayName ?? user?.name ?? 'Mands');
  useEffect(() => { if (!open) return; const close = (event: MouseEvent) => { if (!ref.current?.contains(event.target as Node)) setOpen(false); }; const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false); }; document.addEventListener('mousedown', close); document.addEventListener('keydown', onKey); return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', onKey); }; }, [open]);
  const upload = async (file?: File) => { if (!file) return; setError(''); try { setProfile({ photoDataUrl: await resizeImage(file) }); } catch (reason) { setError(reason instanceof Error ? reason.message : 'Falha no upload.'); } };
  return <div className="profile-menu" ref={ref}>
    <button type="button" className="avatar-button" onClick={() => setOpen(!open)} aria-expanded={open} aria-haspopup="dialog" aria-label="Perfil"><Avatar /></button>
    {open && <div className="profile-card" role="dialog" aria-label="Perfil">
      <button type="button" className="profile-photo" onClick={() => input.current?.click()} aria-label="Trocar foto"><Avatar size={84} /><span><Icon as={Camera} size={16} /></span></button>
      <input ref={input} type="file" accept="image/*" hidden onChange={event => { void upload(event.target.files?.[0]); event.target.value = ''; }} />
      <input className="profile-name" value={name} onChange={event => setName(event.target.value)} onBlur={() => name.trim() && setProfile({ displayName: name.trim() })} aria-label="Nome de exibição" />
      <small>{caption}</small>
      <div className="profile-actions"><button type="button" className="link-button" onClick={() => input.current?.click()}><Icon as={Camera} size={14} /> {profile?.photoDataUrl ? 'Trocar foto' : 'Adicionar foto'}</button>{profile?.photoDataUrl && <button type="button" className="link-button is-muted" onClick={() => setProfile({ photoDataUrl: undefined })}><Icon as={Trash2} size={14} /> Remover</button>}</div>
      {error && <small className="is-warn">{error}</small>}
    </div>}
  </div>;
}
