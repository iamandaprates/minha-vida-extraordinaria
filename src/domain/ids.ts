/** crypto.randomUUID only exists in secure contexts (HTTPS or localhost), so a fallback is required for LAN testing on phones. */
export function newId(): string {
  const c = globalThis.crypto;
  if (c && typeof c.randomUUID === 'function') return c.randomUUID();
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}