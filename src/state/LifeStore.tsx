import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, type PropsWithChildren } from 'react';
import { createEntity, cycleLabel, cycleOf, emptySnapshot, toISODate, touch, type AestheticRecord, type AestheticRitual, type AreaDiagnostic, type AreaNote, type BehaviorEvent, type CalendarEvent, type Collection, type Draft, type EntityId, type EntityOf, type ExecutionRecord, type Evidence, type FactCollection, type FinanceEntry, type Flashcard, type FlashcardRating, type FocusRole, type Goal, type GoalHorizon, type Habit, type HabitCheckIn, type HealthMarker, type HealthMarkerKind, type Idea, type IdeaCategory, type IdentityProfile, type ISODate, type LifeAssessment, type LifeSnapshot, type PlanCollection, type Playlist, type Project, type StudyDeck, type StudySession, type StudySubject, type Task, type UserProfile } from '../domain/models';
import { completionOf, goalOfTask, isHabitDone, normalizeTag } from '../domain/selectors';
import { fetchGoogleEvents } from '../services/googleCalendar';
import type { AuthUser, DataService } from '../services/repository';

/**
 * Single source of state. Every guide of Mive reads the same snapshot, so one record is
 * shown everywhere and changes everywhere at once.
 *
 * - `plan(...)` creates or edits planning records (upsert).
 * - `fact(...)` appends reality. Facts are never edited or removed; corrections are new
 *   facts (a `reversal`, a `postponement`, a check-in with `done: false`).
 * Writes are optimistic: the snapshot updates at once and the data service persists after.
 *
 * Runtime state that is not data (music player, calendar sync status) also lives here,
 * so the top bar and the pages agree, but it is never persisted.
 */

type Status = 'loading' | 'ready' | 'signed-out' | 'error';
/** `playRequest` increases when something (e.g. Preciso Começar) asks the player to start. */
export interface PlayerState { playlistId?: EntityId; playing: boolean; playRequest: number; }
export interface CalendarSyncState { status: 'idle' | 'syncing' | 'synced' | 'error'; lastSyncAt?: string; imported?: number; message?: string; }
interface LifeState { status: Status; user?: AuthUser; snapshot: LifeSnapshot; syncIssue?: string; player: PlayerState; calendarSync: CalendarSyncState; }

type Action =
  | { type: 'hydrate'; user: AuthUser; snapshot: LifeSnapshot }
  | { type: 'status'; status: Status; message?: string }
  | { type: 'upsert'; collection: Collection; entity: EntityOf<Collection> }
  | { type: 'remove'; collection: Collection; id: EntityId }
  | { type: 'syncIssue'; message?: string }
  | { type: 'player'; player: Partial<PlayerState> }
  | { type: 'calendarSync'; state: CalendarSyncState };

function reducer(state: LifeState, action: Action): LifeState {
  switch (action.type) {
    case 'hydrate': {
      const snapshot = { ...emptySnapshot(), ...action.snapshot };
      snapshot.ideas = snapshot.ideas.map(idea => ({ ...idea, tags: idea.tags ?? [], media: idea.media ?? [] }));
      return { ...state, status: 'ready', user: action.user, snapshot, player: { playing: false, playRequest: 0, playlistId: snapshot.playlists[0]?.id } };
    }
    case 'remove': {
      const list = state.snapshot[action.collection] as EntityOf<Collection>[];
      return { ...state, snapshot: { ...state.snapshot, [action.collection]: list.filter(item => item.id !== action.id) } };
    }
    case 'status': return { ...state, status: action.status, syncIssue: action.message };
    case 'syncIssue': return state.syncIssue === action.message ? state : { ...state, syncIssue: action.message };
    case 'player': return { ...state, player: { ...state.player, ...action.player } };
    case 'calendarSync': return { ...state, calendarSync: action.state };
    case 'upsert': {
      const list = state.snapshot[action.collection] as EntityOf<Collection>[];
      const exists = list.some(item => item.id === action.entity.id);
      const next = exists ? list.map(item => item.id === action.entity.id ? action.entity : item) : [...list, action.entity];
      return { ...state, snapshot: { ...state.snapshot, [action.collection]: next } };
    }
  }
}

export interface NewTask { title: string; areaId?: EntityId; projectId?: EntityId; goalId?: EntityId; dueAt?: string; dueHasTime?: boolean; priority?: Task['priority']; origin?: Task['origin']; estimateMinutes?: number; focusOn?: ISODate; isMilestone?: boolean; }
export interface NewEvent { title: string; startsAt: string; endsAt: string; areaId?: EntityId; projectId?: EntityId; }
export interface NewGoal { title: string; areaId: EntityId; horizon: GoalHorizon; why?: string; }
export interface NewHabit { title: string; areaId: EntityId; goalId?: EntityId; frequency: Habit['frequency']; timesPerWeek?: number; blockMinutes?: number; }
export type NewFinanceEntry = Omit<Draft<FinanceEntry>, 'description'> & { description?: string };
export interface NewSession { taskId?: EntityId; goalId?: EntityId; areaId?: EntityId; minutes: number; note?: string; }
export type NewStudySession = Omit<Draft<StudySession>, 'date'> & { date?: ISODate };
export type IdentityDraft = Pick<IdentityProfile, 'declarations' | 'serFazerTer' | 'references' | 'imageDossier'>;
export type BehaviorInput = Omit<Draft<BehaviorEvent>, 'occurredAt' | 'date'>;
export type IdeaChange = Partial<Pick<Idea, 'title' | 'description' | 'tags' | 'media' | 'category' | 'projectId'>>;

export interface LifeActions {
  signIn(): Promise<void>;
  captureDemand(title: string): Task;
  addTask(input: NewTask): Task;
  updateTask(taskId: EntityId, change: Partial<Pick<Task, 'title' | 'estimateMinutes' | 'priority'>>): void;
  /** Appends a completion, or a reversal of the active completion. The Task is never removed. */
  toggleTaskCompletion(taskId: EntityId): void;
  /** Appends a postponement fact and moves the planned due date. */
  postponeTask(taskId: EntityId, toDueAt: string): void;
  /** Pins a task as today's magna or secondary delivery (or unpins with `undefined`). */
  setFocus(taskId: EntityId, day: ISODate | undefined, role?: FocusRole, estimateMinutes?: number): void;
  /** Appends a behavioural fact (sessions, pauses, unblock triggers). */
  logBehavior(input: BehaviorInput): void;
  /** Appends focused time (Modo Execução) and, when asked, the completion. */
  recordSession(input: NewSession, complete?: boolean): void;
  addGoal(input: NewGoal): Goal;
  addProject(areaId: EntityId, title: string, goalId?: EntityId): Project;
  addEvent(input: NewEvent): CalendarEvent;
  addHabit(input: NewHabit): Habit;
  toggleHabit(habitId: EntityId, date?: ISODate): void;
  recordHealthMarker(kind: HealthMarkerKind, date: ISODate, valueKg?: number, note?: string): HealthMarker;
  addFinanceEntry(input: NewFinanceEntry): FinanceEntry;
  depositToVault(vaultId: EntityId, amountCents: number, date: ISODate): FinanceEntry | undefined;
  setVaultTarget(vaultId: EntityId, targetCents: number): void;
  addIdea(title: string, category: IdeaCategory, projectId?: EntityId): Idea;
  updateIdea(ideaId: EntityId, change: IdeaChange): void;
  /** Turns an idea into a planned action. The idea stays, marked as converted. */
  convertIdea(ideaId: EntityId): Task | undefined;
  setIdeaStatus(ideaId: EntityId, status: Idea['status']): void;
  addStudyDeck(name: string, color?: string): StudyDeck;
  addStudySubject(name: string, deckId: EntityId): StudySubject;
  addStudySession(input: NewStudySession): StudySession;
  addFlashcard(deckId: EntityId, front: string, back: string): Flashcard;
  reviewFlashcard(cardId: EntityId, rating: FlashcardRating): void;
  saveIdentity(profile: IdentityDraft): IdentityProfile;
  addEvidence(input: Draft<Evidence>): Evidence;
  setAreaDiagnostic(areaId: EntityId, diagnostic: AreaDiagnostic): void;
  setAreaNote(areaId: EntityId, content: string): void;
  saveAssessment(scores: Record<EntityId, number>): LifeAssessment;
  /** Adds a playlist unless the same Spotify URI is already saved. */
  addPlaylist(name: string, spotifyUri: string, mood: Playlist['mood']): Playlist | undefined;
  removePlaylist(playlistId: EntityId): void;
  setPlayer(player: Partial<PlayerState>): void;
  /** Selects the focus playlist and asks the player to start it. */
  requestFocusMusic(): void;
  recordAesthetic(ritualId: EntityId, date: ISODate, note?: string): AestheticRecord;
  updateRitual(ritualId: EntityId, change: Partial<Pick<AestheticRitual, 'name' | 'intervalDays'>>): void;
  addRitual(name: string, intervalDays: number): AestheticRitual;
  setProfile(change: Partial<Pick<UserProfile, 'displayName' | 'photoDataUrl'>>): void;
  /** Reads Google Calendar with an OAuth token and upserts events by their Google id. */
  syncGoogleCalendar(token: string, days?: number): Promise<void>;
}
export interface LifeStore extends LifeState, LifeActions { mode: DataService['mode']; }

const LifeContext = createContext<LifeStore | null>(null);
const NOTE_SAVE_DELAY = 700;
const syncMessage = 'Não foi possível sincronizar a última alteração. Ela continua aqui e será enviada na próxima vez.';

export function LifeProvider({ service, children }: PropsWithChildren<{ service: DataService }>) {
  const [state, dispatch] = useReducer(reducer, { status: 'loading', snapshot: emptySnapshot(), player: { playing: false, playRequest: 0 }, calendarSync: { status: 'idle' } });
  const stateRef = useRef(state);
  stateRef.current = state;
  /**
   * Writes go through `apply`: the reducer runs on the ref right away, so an action that
   * reads the snapshot right after another one (create a task, then pin it) sees the result.
   */
  const apply = useCallback((action: Action) => { stateRef.current = reducer(stateRef.current, action); dispatch(action); }, []);
  const noteTimers = useRef(new Map<EntityId, ReturnType<typeof setTimeout>>());

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const user = await service.auth.currentUser();
        if (!active) return;
        if (!user) return dispatch({ type: 'status', status: 'signed-out' });
        const snapshot = await service.load(user.id);
        if (active) dispatch({ type: 'hydrate', user, snapshot });
      } catch (error) {
        console.error(error);
        if (active) dispatch({ type: 'status', status: 'error', message: 'Não conseguimos abrir seus registros agora. Tente novamente em instantes.' });
      }
    })();
    const timers = noteTimers.current;
    return () => { active = false; timers.forEach(clearTimeout); };
  }, [service]);

  const persist = useCallback(<C extends Collection>(collection: C, entity: EntityOf<C>) => {
    apply({ type: 'upsert', collection, entity });
    service.save(collection, entity).then(() => dispatch({ type: 'syncIssue' }), error => { console.error(error); dispatch({ type: 'syncIssue', message: syncMessage }); });
  }, [service, apply]);

  const discard = useCallback((collection: PlanCollection, userId: EntityId, id: EntityId) => {
    apply({ type: 'remove', collection, id });
    service.remove(collection, userId, id).catch(error => { console.error(error); dispatch({ type: 'syncIssue', message: syncMessage }); });
  }, [service, apply]);

  const actions = useMemo<LifeActions>(() => {
    const userId = () => { const id = stateRef.current.user?.id; if (!id) throw new Error('Nenhuma pessoa autenticada.'); return id; };
    const snapshot = () => stateRef.current.snapshot;
    const plan = <C extends PlanCollection>(collection: C, draft: Draft<EntityOf<C>>) => { const entity = createEntity<EntityOf<C>>(userId(), draft); persist(collection, entity); return entity; };
    const fact = <C extends FactCollection>(collection: C, draft: Draft<EntityOf<C>>) => { const entity = createEntity<EntityOf<C>>(userId(), draft); persist(collection, entity); return entity; };
    const edit = <C extends PlanCollection>(collection: C, id: EntityId, change: Partial<Draft<EntityOf<C>>>) => { const current = (snapshot()[collection] as EntityOf<C>[]).find(item => item.id === id); if (current) persist(collection, touch(current, change)); };
    const now = () => new Date().toISOString();
    const findTask = (taskId: EntityId) => snapshot().tasks.find(item => item.id === taskId);
    const context = (task: Task) => ({ taskId: task.id, areaId: task.areaId, projectId: task.projectId, goalId: goalOfTask(snapshot(), task)?.id });
    const addTask = (input: NewTask) => plan('tasks', { origin: 'planned', priority: 'normal', ...input, title: input.title.trim() });
    const addFinanceEntry = (input: NewFinanceEntry) => fact('financeEntries', { ...input, description: input.description?.trim() || '' });
    const logBehavior = (input: BehaviorInput) => { const at = new Date(); fact('behaviorEvents', { ...input, occurredAt: at.toISOString(), date: toISODate(at) }); };
    const defaultTags: Record<IdeaCategory, string[]> = { cavu: ['CAVU'], cafe_baiano: ['CaféBaiano'], geral: [] };

    return {
      signIn: () => service.auth.signInWithGoogle(),
      addTask,
      captureDemand: title => addTask({ title, origin: 'captured' }),
      updateTask: (taskId, change) => edit('tasks', taskId, change),
      toggleTaskCompletion(taskId) {
        const task = findTask(taskId);
        if (!task) return;
        const completion = completionOf(taskId, snapshot().executions);
        fact('executions', completion ? { ...context(task), kind: 'reversal', reversesId: completion.id, occurredAt: now() } satisfies Draft<ExecutionRecord> : { ...context(task), kind: 'completion', occurredAt: now() } satisfies Draft<ExecutionRecord>);
      },
      postponeTask(taskId, toDueAt) {
        const task = findTask(taskId);
        if (!task) return;
        fact('executions', { ...context(task), kind: 'postponement', fromDueAt: task.dueAt, toDueAt, occurredAt: now() });
        persist('tasks', touch(task, { dueAt: toDueAt, focusOn: task.focusOn === toISODate(new Date()) ? undefined : task.focusOn }));
      },
      setFocus(taskId, day, role, estimateMinutes) {
        const task = findTask(taskId);
        if (!task) return;
        const today = toISODate(new Date());
        if (day) logBehavior({ kind: 'focus_planned', taskId, role: role ?? 'secondary' });
        else if (task.focusOn === today) logBehavior({ kind: 'focus_unplanned', taskId, role: task.focusRole });
        persist('tasks', touch(task, { focusOn: day, focusRole: day ? role ?? 'secondary' : undefined, ...(estimateMinutes ? { estimateMinutes } : {}) }));
      },
      logBehavior,
      recordSession(input, complete = false) {
        const task = input.taskId ? findTask(input.taskId) : undefined;
        const base = task ? context(task) : { areaId: input.areaId, goalId: input.goalId };
        if (input.minutes > 0) fact('executions', { ...base, kind: 'session', durationMinutes: Math.round(input.minutes), note: input.note, occurredAt: now() });
        if (task && complete && !completionOf(task.id, snapshot().executions)) fact('executions', { ...context(task), kind: 'completion', occurredAt: now() });
      },
      addGoal: input => plan('goals', { ...input, title: input.title.trim(), status: 'active', cycle: input.horizon === 'current' ? cycleOf(new Date()) : undefined }),
      addProject: (areaId, title, goalId) => plan('projects', { areaId, title: title.trim(), goalId, status: 'active' }),
      addEvent: input => plan('events', { ...input, title: input.title.trim(), status: 'planned', source: 'manual' }),
      addHabit: input => plan('habits', { ...input, title: input.title.trim(), active: true }),
      toggleHabit(habitId, date = toISODate(new Date())) {
        fact('habitCheckIns', { habitId, date, done: !isHabitDone(habitId, date, snapshot().habitCheckIns), occurredAt: now() } satisfies Draft<HabitCheckIn>);
      },
      recordHealthMarker: (kind, date, valueKg, note) => fact('healthMarkers', { kind, date, valueKg: valueKg === undefined ? undefined : Math.round(valueKg * 10) / 10, note: note?.trim() || undefined }),
      addFinanceEntry,
      depositToVault(vaultId, amountCents, date) {
        const vault = snapshot().vaults.find(item => item.id === vaultId);
        return vault ? addFinanceEntry({ type: 'vault_deposit', amountCents, date, category: 'vault', vaultId, description: `Aporte · ${vault.name}` }) : undefined;
      },
      setVaultTarget: (vaultId, targetCents) => edit('vaults', vaultId, { targetCents }),
      addIdea: (title, category, projectId) => plan('ideas', { title: title.trim(), category, status: 'inbox', projectId, tags: defaultTags[category], media: [] }),
      updateIdea(ideaId, change) {
        const tags = change.tags ? [...new Set(change.tags.map(normalizeTag).filter(Boolean))] : undefined;
        edit('ideas', ideaId, { ...change, ...(tags ? { tags } : {}) });
      },
      convertIdea(ideaId) {
        const idea = snapshot().ideas.find(item => item.id === ideaId);
        if (!idea || idea.status === 'converted') return undefined;
        const project = snapshot().projects.find(item => item.id === idea.projectId) ?? snapshot().projects.find(item => item.tag && idea.tags.some(tag => tag.toLocaleLowerCase('pt-BR') === item.tag!.toLocaleLowerCase('pt-BR')));
        const goal = project ? undefined : idea.category === 'cavu' ? snapshot().goals.find(item => item.pillar === 'business') : undefined;
        const task = addTask({ title: idea.title, origin: 'idea', projectId: project?.id, areaId: project?.areaId ?? goal?.areaId, goalId: goal?.id });
        persist('ideas', touch(idea, { status: 'converted', taskId: task.id }));
        return task;
      },
      setIdeaStatus: (ideaId, status) => edit('ideas', ideaId, { status }),
      addStudyDeck: (name, color = '#8767ed') => plan('studyDecks', { name: name.trim(), color, position: snapshot().studyDecks.length }),
      addStudySubject(name, deckId) { const deck = snapshot().studyDecks.find(item => item.id === deckId); return plan('studySubjects', { name: name.trim(), deckId, goalId: deck?.goalId, position: snapshot().studySubjects.filter(subject => subject.deckId === deckId).length }); },
      addStudySession: input => fact('studySessions', { ...input, date: input.date ?? toISODate(new Date()) }),
      addFlashcard: (deckId, front, back) => plan('flashcards', { deckId, front: front.trim(), back: back.trim() }),
      reviewFlashcard: (cardId, rating) => { fact('flashcardReviews', { cardId, rating, reviewedAt: now() }); },
      saveIdentity: profile => fact('identityProfiles', { ...profile, savedAt: now() }),
      addEvidence: input => fact('evidences', { ...input, title: input.title.trim() }),
      setAreaDiagnostic: (areaId, diagnostic) => edit('areas', areaId, { diagnostic }),
      setAreaNote(areaId, content) {
        const existing = snapshot().areaNotes.find(note => note.areaId === areaId);
        const note: AreaNote = existing ? touch(existing, { content }) : createEntity<AreaNote>(userId(), { areaId, content });
        apply({ type: 'upsert', collection: 'areaNotes', entity: note });
        const timers = noteTimers.current;
        clearTimeout(timers.get(areaId));
        timers.set(areaId, setTimeout(() => { timers.delete(areaId); const latest = stateRef.current.snapshot.areaNotes.find(item => item.areaId === areaId); if (latest) persist('areaNotes', latest); }, NOTE_SAVE_DELAY));
      },
      saveAssessment(scores) { const cycle = cycleOf(new Date()); return fact('assessments', { cycle, period: cycleLabel(cycle), scores, assessedAt: now() }); },
      addPlaylist(name, spotifyUri, mood) {
        if (snapshot().playlists.some(item => item.spotifyUri === spotifyUri)) return undefined;
        return plan('playlists', { name: name.trim() || 'Minha playlist', spotifyUri, mood, position: snapshot().playlists.length });
      },
      removePlaylist(playlistId) {
        const playlist = snapshot().playlists.find(item => item.id === playlistId);
        if (!playlist) return;
        discard('playlists', playlist.userId, playlist.id);
        if (stateRef.current.player.playlistId === playlistId) apply({ type: 'player', player: { playlistId: snapshot().playlists.find(item => item.id !== playlistId)?.id } });
      },
      setPlayer: player => apply({ type: 'player', player }),
      requestFocusMusic() {
        const focus = snapshot().playlists.find(item => item.mood === 'focus') ?? snapshot().playlists[0];
        apply({ type: 'player', player: { playlistId: focus?.id ?? stateRef.current.player.playlistId, playRequest: stateRef.current.player.playRequest + 1 } });
      },
      recordAesthetic: (ritualId, date, note) => fact('aestheticRecords', { ritualId, date, note: note?.trim() || undefined }),
      updateRitual: (ritualId, change) => edit('aestheticRituals', ritualId, change),
      addRitual: (name, intervalDays) => plan('aestheticRituals', { name: name.trim(), intervalDays, icon: 'sparkles', position: snapshot().aestheticRituals.length }),
      setProfile(change) {
        const current = snapshot().profiles[0];
        if (current) persist('profiles', touch(current, change));
        else plan('profiles', change);
      },
      async syncGoogleCalendar(token, days = 21) {
        dispatch({ type: 'calendarSync', state: { status: 'syncing' } });
        try {
          const from = new Date(); from.setHours(0, 0, 0, 0); from.setDate(from.getDate() - 7);
          const to = new Date(from.getTime() + (days + 7) * 86_400_000);
          const items = await fetchGoogleEvents(token, from, to);
          for (const item of items) {
            const existing = snapshot().events.find(event => event.source === 'google' && event.externalId === item.externalId);
            if (existing) persist('events', touch(existing, item));
            else plan('events', item);
          }
          dispatch({ type: 'calendarSync', state: { status: 'synced', lastSyncAt: now(), imported: items.length } });
        } catch (error) {
          dispatch({ type: 'calendarSync', state: { status: 'error', message: error instanceof Error ? error.message : 'Falha ao sincronizar.' } });
        }
      }
    };
  }, [persist, discard, apply, service]);

  const value = useMemo<LifeStore>(() => ({ ...state, mode: service.mode, ...actions }), [state, actions, service.mode]);
  return <LifeContext.Provider value={value}>{children}</LifeContext.Provider>;
}

export function useLife(): LifeStore {
  const store = useContext(LifeContext);
  if (!store) throw new Error('useLife precisa estar dentro de <LifeProvider>.');
  return store;
}
