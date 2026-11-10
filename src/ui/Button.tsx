import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from './cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'quiet';
type Size = 'sm' | 'md' | 'lg' | 'icon';
const variants: Record<Variant, string> = {
  primary: 'bg-grad-magenta text-white shadow-magenta hover:brightness-105',
  secondary: 'glass text-ink hover:border-lilas',
  ghost: 'border border-line/15 text-ink hover:border-magenta/40 hover:text-magenta',
  quiet: 'text-ink-soft hover:text-magenta hover:bg-rosa/60 dark:hover:bg-white/5'
};
const sizes: Record<Size, string> = { sm: 'h-10 px-4 text-sm', md: 'h-11 px-5 text-sm', lg: 'h-14 px-7 text-base', icon: 'h-11 w-11' };

export const Button = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }>(
  ({ variant = 'primary', size = 'md', className, type = 'button', ...props }, ref) =>
    <button ref={ref} type={type} className={cn('inline-flex items-center justify-center gap-2 rounded-full font-semibold transition duration-200 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50', variants[variant], sizes[size], className)} {...props} />
);
Button.displayName = 'Button';
