import type { EntityId, LifeSnapshot } from '../domain/models';
import { createSeed } from './seed';

/**
 * Local mode (no Supabase keys): the same real seed, kept in memory for this session.
 * No fictitious records: every screen starts from Mands' real plan and fills with her own use.
 */
export const DEMO_USER_ID = 'local-user';
export const createDemoSnapshot = (userId: EntityId = DEMO_USER_ID, now = new Date()): LifeSnapshot => createSeed(userId, now);
