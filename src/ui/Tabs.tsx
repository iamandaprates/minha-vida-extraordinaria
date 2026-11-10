import { cn } from './cn';

/** Abas em pílula. Funciona como grupo de botões acessível (role tablist). */
export function Tabs<T extends string>({ value, options, onChange, label, className }: { value: T; options: { value: T; label: string }[]; onChange: (value: T) => void; label: string; className?: string }) {
  return <div role="tablist" aria-label={label} className={cn('glass inline-flex max-w-full gap-1 overflow-x-auto rounded-full p-1', className)}>
    {options.map(option => <button key={option.value} type="button" role="tab" aria-selected={value === option.value} onClick={() => onChange(option.value)} className={cn('h-10 whitespace-nowrap rounded-full px-4 text-sm font-semibold transition', value === option.value ? 'bg-grad-magenta text-white shadow-magenta' : 'text-ink-soft hover:text-magenta')}>{option.label}</button>)}
  </div>;
}
