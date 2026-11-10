import { motion } from 'framer-motion';
import { useId, type ReactNode } from 'react';

/** Anel de progresso magenta. Sem valor, mostra só o trilho: nada de número inventado. */
export function ProgressRing({ value, size = 160, stroke = 14, children, label }: { value?: number; size?: number; stroke?: number; children?: ReactNode; label?: string }) {
  const id = useId();
  const radius = (size - stroke) / 2;
  const length = 2 * Math.PI * radius;
  const clamped = value === undefined ? 0 : Math.min(1, Math.max(0, value));
  return <div className="relative inline-grid place-items-center" style={{ width: size, height: size }} role="img" aria-label={label ?? (value === undefined ? 'Sem registros' : `${Math.round(clamped * 100)}%`)}>
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
      <defs><linearGradient id={id} x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#F31991" /><stop offset="100%" stopColor="#CFA3FF" /></linearGradient></defs>
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth={stroke} className="stroke-rosa dark:stroke-white/10" />
      {value !== undefined && <motion.circle cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth={stroke} strokeLinecap="round" stroke={`url(#${id})`} strokeDasharray={length} initial={{ strokeDashoffset: length }} animate={{ strokeDashoffset: length * (1 - clamped) }} transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }} style={{ filter: 'drop-shadow(0 6px 12px rgba(243,25,145,0.35))' }} />}
    </svg>
    <div className="absolute inset-0 grid place-content-center text-center">{children}</div>
  </div>;
}
