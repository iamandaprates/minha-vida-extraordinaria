import { vi } from 'vitest';

const live: Array<() => void> = [];
export function cleanupAll() { live.splice(0).forEach(fn => { try { fn(); } catch { /* already unmounted */ } }); document.body.innerHTML = ''; }

/** Simulates a full page reload: fresh module graph (store, React), same localStorage. */
export async function boot() {
  vi.resetModules();
  const rtl = await import('@testing-library/react');
  const { App } = await import('../src/app/App');
  const utils = rtl.render(<App />);
  live.push(utils.unmount);
  return { rtl, ...utils, screen: rtl.screen, fireEvent: rtl.fireEvent };
}
export const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
