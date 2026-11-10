import type { HTMLAttributes, PropsWithChildren } from 'react';

/** Glass panel. `tone="noble"` is the gradient card used for the most important block of a page. */
export function Card({ children, className = '', tone, ...props }: PropsWithChildren<HTMLAttributes<HTMLElement> & { tone?: 'glass' | 'noble' | 'soft' }>) {
  return <section className={`card ${tone ? `card-${tone}` : ''} ${className}`} {...props}>{children}</section>;
}
