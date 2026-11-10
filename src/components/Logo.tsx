/**
 * Mive monogram: an "M" with an asymmetric stroke, thin on the left, heavy on the right,
 * like a high contrast display serif. Same drawing as public/favicon.svg.
 */
export function Monogram({ size = 30 }: { size?: number }) {
  return <svg className="monogram" width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
    <defs><linearGradient id="mive-m" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#f3197d" /><stop offset="1" stopColor="#ff5c72" /></linearGradient></defs>
    <path className="monogram-thin" d="M14 50V15.5h2.4L32.6 41l-1.5 2.6L16.4 20.3V50z" />
    <path className="monogram-heavy" d="M30.2 41.2 46 14h6.2v36h-7.6V27.3L34.1 45.6z" />
    <path className="monogram-serif" d="M9.5 50h11v1.8h-11zM41.5 50h14v1.8h-14z" />
    <circle className="monogram-dot" cx="55" cy="11" r="3.2" fill="url(#mive-m)" />
  </svg>;
}

export function Logo() {
  return <span className="logo" aria-label="Mive"><Monogram /><span className="wordmark">Mive</span><i className="logo-pulse" aria-hidden="true" /></span>;
}
