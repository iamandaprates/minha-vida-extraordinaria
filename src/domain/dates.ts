const pad = (value: number) => String(value).padStart(2, '0');
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

export const semesterLabel = (date: Date) => `${date.getMonth() < 6 ? '1º' : '2º'} semestre de ${date.getFullYear()}`;
export const localDateKey = (date: Date = new Date()) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
export function formatDateBR(value: string): string {
  if (DATE_ONLY.test(value)) { const [year, month, day] = value.split('-'); return `${day}/${month}/${year}`; }
  return new Date(value).toLocaleDateString('pt-BR');
}
export const formatDateTimeBR = (iso: string) => `${new Date(iso).toLocaleDateString('pt-BR')} às ${pad(new Date(iso).getHours())}:${pad(new Date(iso).getMinutes())}`;
export function toDateTimeLocalValue(iso: string): string { const date = new Date(iso); return `${localDateKey(date)}T${pad(date.getHours())}:${pad(date.getMinutes())}`; }
export const fromDateTimeLocalValue = (value: string) => new Date(value).toISOString();