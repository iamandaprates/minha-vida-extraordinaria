import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from 'react';
import { cn } from './cn';

/** Campo com rótulo sempre visível (acessibilidade) e dica opcional. */
export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: ReactNode; error?: string }>(
  ({ label, hint, error, className, id, ...props }, ref) => {
    const auto = useId(); const inputId = id ?? auto;
    return <label htmlFor={inputId} className="grid gap-2">
      <span className="text-sm font-semibold text-ink">{label}</span>
      <input ref={ref} id={inputId} aria-invalid={Boolean(error)} className={cn('h-12 rounded-2xl border border-line/15 bg-white/80 px-4 text-base font-medium text-ink placeholder:text-muted/70 outline-none transition focus:border-magenta focus:ring-4 focus:ring-magenta/15 dark:bg-white/5', className)} {...props} />
      {error ? <span className="text-sm font-medium text-magenta">{error}</span> : hint && <span className="text-sm text-muted">{hint}</span>}
    </label>;
  }
);
Input.displayName = 'Input';
