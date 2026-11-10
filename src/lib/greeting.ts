export const greeting = (date = new Date()) => { const hour = date.getHours(); return hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite'; };
export const firstName = (name?: string) => (name ?? '').trim().split(/\s+/)[0] ?? '';
