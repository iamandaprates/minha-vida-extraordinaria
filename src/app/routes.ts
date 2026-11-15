import { createElement, lazy, type ComponentType } from 'react';
import type { Route } from './navigation';

/**
 * One chunk per guide (React.lazy + Suspense), with a way to load it ahead of the click.
 *
 * A lazy component always suspends on its first render, and React then keeps the fallback on
 * screen for a moment, even when the chunk is already there. So a chunk that was preloaded
 * (hover, focus, idle time, or right before navigating) is rendered directly, and the Suspense
 * fallback is left for what it is for: a slow connection.
 */
function preloadable<P extends object>(loader: () => Promise<ComponentType<P>>) {
  let loaded: ComponentType<P> | undefined;
  let pending: Promise<ComponentType<P>> | undefined;
  let viaLazy = false;
  const load = () => (pending ??= loader().then(component => (loaded = component), error => { pending = undefined; throw error; }));
  const Lazy = lazy(() => load().then(component => ({ default: component })));
  const Component = (props: P) => {
    if (loaded && !viaLazy) return createElement(loaded, props);
    viaLazy = true;
    return createElement(Lazy as ComponentType<P>, props);
  };
  return Object.assign(Component, { preload: () => load().then(() => undefined, () => undefined), isLoaded: () => Boolean(loaded) });
}

export const HomePage = preloadable(() => import('../pages/HomePage').then(module => module.HomePage));
export const AgendaPage = preloadable(() => import('../pages/AgendaPage').then(module => module.AgendaPage));
export const AreasPage = preloadable(() => import('../pages/AreasPage').then(module => module.AreasPage));
export const GoalsPage = preloadable(() => import('../pages/GoalsPage').then(module => module.GoalsPage));
export const StudiesPage = preloadable(() => import('../pages/StudiesPage').then(module => module.StudiesPage));
export const IdeasPage = preloadable(() => import('../pages/IdeasPage').then(module => module.IdeasPage));
export const EvolutionPage = preloadable(() => import('../pages/EvolutionPage').then(module => module.EvolutionPage));
export const AssistantPanel = preloadable(() => import('../components/AssistantPanel').then(module => module.AssistantPanel));
export const IdentityDrawer = preloadable(() => import('../components/IdentityDrawer').then(module => module.IdentityDrawer));

const pages = { inicio: HomePage, agenda: AgendaPage, areas: AreasPage, metas: GoalsPage, estudos: StudiesPage, ideias: IdeasPage, evolucao: EvolutionPage } satisfies Record<Route, { preload(): Promise<void>; isLoaded(): boolean }>;

export const preloadRoute = (route: Route) => pages[route].preload();
export const isRouteLoaded = (route: Route) => pages[route].isLoaded();
/** Downloads the remaining guides and panels when the browser is idle. */
export function preloadEverything() {
  const run = () => { (Object.keys(pages) as Route[]).forEach(route => void preloadRoute(route)); void AssistantPanel.preload(); void IdentityDrawer.preload(); };
  if ('requestIdleCallback' in window) window.requestIdleCallback(run, { timeout: 3000 }); else setTimeout(run, 1200);
}
