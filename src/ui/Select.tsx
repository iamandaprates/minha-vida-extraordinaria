import { forwardRef, useId, type SelectHTMLAttributes } from 'react';
import { cn } from './cn';

/** Seletor nativo com rótulo visível, no mesmo estilo do Input. */
export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement> & { label: string; options: { value: string; label: string }[] }>(
  ({ label, options, className, id, ...props }, ref) => {
    const auto = useId(); const selectId = id ?? auto;
    return <label htmlFor={selectId} className="grid gap-2">
      <span className="text-sm font-semibold text-ink">{label}</span>
      <select ref={ref} id={selectId} className={cn('h-12 rounded-2xl border border-line/15 bg-white/80 px-3 text-base font-medium text-ink outline-none transition focus:border-magenta focus:ring-4 focus:ring-magenta/15 dark:bg-[#1a1022]', className)} {...props}>
        {options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>;
  }
);
Select.displayName = 'Select';
