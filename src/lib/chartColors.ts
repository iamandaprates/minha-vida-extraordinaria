import { useMive } from '../store/useMive';

/** Cores dos gráficos por tema. Atributos SVG não leem CSS variables, então ficam aqui. */
export function useChartColors() {
  const dark = useMive(state => state.settings.theme === 'dark');
  return dark
    ? { ink: '#F6EEFC', inkSoft: '#DECEF0', muted: '#BAAACE', grid: 'rgba(207,163,255,0.14)', surface: '#14101c', primary: '#F31991', secondary: '#CFA3FF' }
    : { ink: '#3B0A4D', inkSoft: '#5C3A6E', muted: '#705C80', grid: 'rgba(59,10,77,0.08)', surface: '#FFFFFF', primary: '#F31991', secondary: '#CFA3FF' };
}
