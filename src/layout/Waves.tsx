/** Ondas fluidas magenta ao fundo. SVG leve, fixo, sem custo de rolagem. */
export function Waves() {
  return <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" style={{ opacity: 'var(--wave-opacity)' }}>
    <div className="absolute -right-40 -top-40 h-[520px] w-[520px] rounded-full bg-magenta/20 blur-[110px]" />
    <div className="absolute -left-32 bottom-0 h-[460px] w-[460px] rounded-full bg-lilas/30 blur-[120px]" />
    <svg className="absolute -right-24 top-16 h-[620px] w-[1100px] animate-drift overflow-visible" viewBox="0 0 1100 620" fill="none">
      <defs>
        <linearGradient id="wave-a" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#F31991" stopOpacity="0" /><stop offset="0.45" stopColor="#F31991" stopOpacity="0.55" /><stop offset="1" stopColor="#CFA3FF" stopOpacity="0.15" /></linearGradient>
        <linearGradient id="wave-b" x1="1" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#FFE6F3" stopOpacity="0.1" /><stop offset="0.5" stopColor="#FF6FBF" stopOpacity="0.45" /><stop offset="1" stopColor="#F31991" stopOpacity="0" /></linearGradient>
      </defs>
      <path d="M40 420C220 300 360 520 560 380C760 240 840 60 1080 120" stroke="url(#wave-a)" strokeWidth="70" strokeLinecap="round" />
      <path d="M120 520C320 420 460 600 660 470C860 340 920 200 1100 230" stroke="url(#wave-b)" strokeWidth="38" strokeLinecap="round" />
      <path d="M260 300C420 200 560 330 720 240C880 150 960 40 1100 60" stroke="url(#wave-b)" strokeWidth="14" strokeLinecap="round" opacity="0.7" />
    </svg>
    <svg className="absolute -bottom-40 -left-40 h-[420px] w-[900px] animate-drift overflow-visible [animation-delay:-9s]" viewBox="0 0 900 420" fill="none">
      <path d="M0 300C180 180 320 380 520 260C720 140 780 40 900 80" stroke="url(#wave-a)" strokeWidth="46" strokeLinecap="round" opacity="0.6" />
    </svg>
  </div>;
}
