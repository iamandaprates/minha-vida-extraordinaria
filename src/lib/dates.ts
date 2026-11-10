import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { ISODate } from '../types';

export const toISODate = (date: Date): ISODate => format(date, 'yyyy-MM-dd');
export const todayISO = () => toISODate(new Date());
export const fromISODate = (value: ISODate) => { const [year, month, day] = value.split('-').map(Number); return new Date(year, month - 1, day); };
export const formatDay = (value: ISODate | Date, pattern = "EEEE, d 'de' MMMM") => format(typeof value === 'string' ? fromISODate(value) : value, pattern, { locale: ptBR });
export const minutesOf = (hhmm: string) => { const [hours, minutes] = hhmm.split(':').map(Number); return hours * 60 + minutes; };
export const hhmm = (minutes: number) => `${String(Math.floor(minutes / 60) % 24).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
