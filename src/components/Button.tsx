import type { ButtonHTMLAttributes, PropsWithChildren } from 'react';

type Variant = 'primary' | 'ghost' | 'soft' | 'light';
export function Button({ children, className = '', variant = 'soft', type = 'button', ...props }: PropsWithChildren<ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }>) {
  return <button type={type} className={`button button-${variant} ${className}`} {...props}>{children}</button>;
}
