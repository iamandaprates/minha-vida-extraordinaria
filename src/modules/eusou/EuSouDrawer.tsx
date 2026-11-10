import { firstName } from '../../lib/greeting';
import { AvatarImage } from '../../layout/Avatar';
import { useMive } from '../../store/useMive';
import { Sheet } from '../../ui';

/** Gaveta "Eu Sou". O conteúdo completo (MAVI, SER-FAZER-TER, evidências, dossiê) chega na Fase 6. */
export function EuSouDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const name = firstName(useMive(state => state.profile?.name));
  const sections = ['Declarações MAVI · pág. 141', 'Matriz SER · FAZER · TER', 'Banco de Evidências', 'Dossiê de Imagem Pessoal'];
  return <Sheet open={open} onClose={onClose} title="Quem eu sou, por escolha" eyebrow="Eu Sou">
    <div className="mb-6 flex items-center gap-4"><AvatarImage size={64} /><div><p className="text-lg font-bold">{name || 'Você'}</p><p className="text-sm text-ink-soft">Identidade em construção diária.</p></div></div>
    <ul className="grid gap-3">{sections.map(section => <li key={section} className="rounded-2xl border border-dashed border-lilas/60 p-4"><p className="font-semibold">{section}</p><p className="mt-1 text-sm text-muted">Chega na Fase 6.</p></li>)}</ul>
  </Sheet>;
}
