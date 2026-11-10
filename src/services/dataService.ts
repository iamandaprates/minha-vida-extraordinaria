import { demoDataService } from './demoDataService';
import type { DataService } from './repository';
import { createSupabaseDataService, readSupabaseConfig } from './supabase';

/** Cloud when Supabase is configured, otherwise the in-memory demonstration. */
export function createDataService(): DataService {
  const config = readSupabaseConfig();
  return config ? createSupabaseDataService(config) : demoDataService;
}
