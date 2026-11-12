import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useEffect, useRef, type PropsWithChildren, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { cn } from './cn';

function useEscape(open: boolean, onClose: () => void) {
  useEffect(() => { if (!open) return; const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose(); window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey); }, [open, onClose]);
}

const focusable = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
/**
 * Foco acessível: ao abrir, o foco entra no diálogo (respeitando autoFocus), o Tab fica preso
 * dentro dele e, ao fechar, volta para o elemento que abriu.
 */
function useDialogFocus(open: boolean, ref: RefObject<HTMLElement>) {
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const frame = requestAnimationFrame(() => { const node = ref.current; if (node && !node.contains(document.activeElement)) node.focus({ preventScroll: true }); });
    const onKey = (event: KeyboardEvent) => {
      const node = ref.current;
      if (event.key !== 'Tab' || !node) return;
      const items = [...node.querySelectorAll<HTMLElement>(focusable)].filter(item => item.offsetParent !== null);
      if (!items.length) { event.preventDefault(); return; }
      const first = items[0]; const last = items[items.length - 1];
      if (event.shiftKey && (document.activeElement === first || document.activeElement === node)) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => { cancelAnimationFrame(frame); document.removeEventListener('keydown', onKey); if (previous?.isConnected) previous.focus({ preventScroll: true }); };
  }, [open, ref]);
}

/** Diálogo central em vidro, com fundo desfocado. Fecha no Esc e no clique fora. */
export function Modal({ open, onClose, title, eyebrow, children, className }: PropsWithChildren<{ open: boolean; onClose: () => void; title: string; eyebrow?: string; className?: string }>) {
  useEscape(open, onClose);
  const ref = useRef<HTMLElement>(null);
  useDialogFocus(open, ref);
  return createPortal(<AnimatePresence>{open && <motion.div className="fixed inset-0 z-[60] grid place-items-center bg-violeta/30 p-4 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={onClose}>
    <motion.section ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-label={title} onMouseDown={event => event.stopPropagation()} className={cn('glass-strong relative max-h-[90vh] outline-none w-full max-w-lg overflow-y-auto rounded-4xl p-6 sm:p-8', className)} initial={{ opacity: 0, y: 16, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 12, scale: 0.98 }} transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}>
      <button type="button" onClick={onClose} aria-label="Fechar" className="absolute right-4 top-4 grid h-11 w-11 place-items-center rounded-full text-muted transition hover:bg-rosa hover:text-magenta dark:hover:bg-white/10"><X size={20} strokeWidth={1.75} /></button>
      {eyebrow && <p className="eyebrow">{eyebrow}</p>}
      <h2 className="mb-5 mt-1 pr-10 text-2xl">{title}</h2>
      {children}
    </motion.section>
  </motion.div>}</AnimatePresence>, document.body);
}

/** Gaveta: lateral no desktop, de baixo no celular. */
export function Sheet({ open, onClose, title, eyebrow, children, side = 'right' }: PropsWithChildren<{ open: boolean; onClose: () => void; title: string; eyebrow?: string; side?: 'right' | 'bottom' }>) {
  useEscape(open, onClose);
  const ref = useRef<HTMLElement>(null);
  useDialogFocus(open, ref);
  const bottom = side === 'bottom';
  return createPortal(<AnimatePresence>{open && <motion.div className={cn('fixed inset-0 z-[60] flex bg-violeta/30 backdrop-blur-sm', bottom ? 'items-end' : 'justify-end')} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={onClose}>
    <motion.aside ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-label={title} onMouseDown={event => event.stopPropagation()} className={cn('glass-strong overflow-y-auto p-6 outline-none', bottom ? 'pb-safe max-h-[85vh] w-full rounded-t-4xl' : 'h-full w-full max-w-md rounded-l-4xl')} initial={bottom ? { y: '100%' } : { x: '100%' }} animate={bottom ? { y: 0 } : { x: 0 }} exit={bottom ? { y: '100%' } : { x: '100%' }} transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}>
      {bottom && <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-line/15" aria-hidden="true" />}
      <div className="mb-5 flex items-start justify-between gap-4"><div>{eyebrow && <p className="eyebrow">{eyebrow}</p>}<h2 className="mt-1 text-2xl">{title}</h2></div><button type="button" onClick={onClose} aria-label="Fechar" className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-muted transition hover:bg-rosa hover:text-magenta dark:hover:bg-white/10"><X size={20} strokeWidth={1.75} /></button></div>
      {children}
    </motion.aside>
  </motion.div>}</AnimatePresence>, document.body);
}
