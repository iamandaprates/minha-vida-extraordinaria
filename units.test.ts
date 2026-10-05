import { describe, expect, it, vi } from 'vitest';
import { computeAreaMetrics, isTaskOverdue } from '../src/domain/areaMetrics';
import { LocalStorageRepository } from '../src/services/localRepository';
import type { Task } from '../src/domain/models';

const base = { userId: 'u', createdAt: '2026-10-01T00:00:00.000Z', updatedAt: '2026-10-01T00:00:00.000Z' };
const task = (over: Partial<Task>): Task => ({ ...base, id: Math.random().toString(), title: 't', status: 'open', areaId: 'a', ...over });
const empty = { goals: [], ideas: [], projects: [], events: [] };

describe('metrics', () => {
  const now = new Date(2026, 9, 3, 12);
  it('sem registros: nada inventado', () => { const m = computeAreaMetrics('a', { ...empty, tasks: [] }, now); expect(m.executionPct).toBeNull(); expect(m.recordsTotal).toBe(0); });
  it('conta concluidas, pendentes, atrasadas e execucao', () => {
    const tasks = [task({ status: 'done', dueAt: '2026-09-01' }), task({ dueAt: '2026-10-02' }), task({ dueAt: '2026-10-03' }), task({ dueAt: '2026-10-09' }), task({ areaId: 'outra', dueAt: '2020-01-01' })];
    const m = computeAreaMetrics('a', { ...empty, tasks }, now);
    expect(m).toMatchObject({ actionsTotal: 4, actionsDone: 1, actionsPending: 3, actionsOverdue: 1, executionPct: 25 });
  });
  it('prazo de hoje nao e atrasado; concluida nunca e atrasada', () => { expect(isTaskOverdue(task({ dueAt: '2026-10-03' }), now)).toBe(false); expect(isTaskOverdue(task({ dueAt: '2026-10-02', status: 'done' }), now)).toBe(false); });
  it('movimentacao recente considera 7 dias', () => {
    const tasks = [task({ updatedAt: new Date(2026, 9, 1).toISOString() }), task({ updatedAt: new Date(2026, 8, 20).toISOString() })];
    expect(computeAreaMetrics('a', { ...empty, tasks }, now).recentMovement).toBe(1);
  });
});

describe('LocalStorageRepository', () => {
  it('guarda e atualiza por id', async () => { localStorage.clear(); const r = new LocalStorageRepository<Task>('t'); await r.save('u', task({ id: '1', title: 'a' })); await r.save('u', task({ id: '1', title: 'b' })); expect((await r.list('u')).map(t => t.title)).toEqual(['b']); await r.remove('u', '1'); expect(await r.list('u')).toEqual([]); });
  it('isola usuarios', async () => { localStorage.clear(); const r = new LocalStorageRepository<Task>('t'); await r.save('u1', task({ id: '1' })); expect(await r.list('u2')).toEqual([]); });
  it('JSON corrompido nao quebra e e preservado', async () => { localStorage.clear(); localStorage.setItem('mve:v1:t:u', '{quebrado'); const r = new LocalStorageRepository<Task>('t'); expect(await r.list('u')).toEqual([]); expect(Object.keys(localStorage).some(k => k.includes(':corrupted:'))).toBe(true); });
  it('sem localStorage usa memoria', async () => { const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked'); }); const r = new LocalStorageRepository<Task>('t'); await r.save('u', task({ id: '1' })); expect(await r.list('u')).toHaveLength(1); spy.mockRestore(); });
});
