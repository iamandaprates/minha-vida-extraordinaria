import type { CalendarEvent, Draft } from '../domain/models';

/**
 * Google Calendar adapter (read only for now).
 * - `requestGoogleToken` opens Google's OAuth consent with Google Identity Services, when
 *   `VITE_GOOGLE_CLIENT_ID` is configured.
 * - `fetchGoogleEvents` reads the primary calendar with any OAuth access token.
 * Tokens are never stored: they live only in memory for the sync that uses them.
 */
export const GOOGLE_SCOPE = 'https://www.googleapis.com/auth/calendar.readonly';
export const googleClientId = (): string | undefined => import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim() || undefined;

interface TokenResponse { access_token?: string; error?: string; error_description?: string; }
interface TokenClient { requestAccessToken: (options?: { prompt?: string }) => void; }
interface GoogleOAuth { accounts: { oauth2: { initTokenClient: (config: { client_id: string; scope: string; callback: (response: TokenResponse) => void; error_callback?: (error: { message?: string }) => void }) => TokenClient } } }

let gisLoading: Promise<GoogleOAuth> | undefined;
function loadGis(): Promise<GoogleOAuth> {
  const existing = (window as unknown as { google?: GoogleOAuth }).google;
  if (existing?.accounts?.oauth2) return Promise.resolve(existing);
  gisLoading ??= new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.onload = () => resolve((window as unknown as { google: GoogleOAuth }).google);
    script.onerror = () => { gisLoading = undefined; reject(new Error('Não foi possível carregar o login do Google.')); };
    document.head.appendChild(script);
  });
  return gisLoading;
}

export async function requestGoogleToken(clientId: string): Promise<string> {
  const google = await loadGis();
  return new Promise((resolve, reject) => {
    const client = google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: GOOGLE_SCOPE,
      callback: response => response.access_token ? resolve(response.access_token) : reject(new Error(response.error_description ?? response.error ?? 'Autorização recusada.')),
      error_callback: error => reject(new Error(error.message ?? 'Janela do Google fechada.'))
    });
    client.requestAccessToken({ prompt: '' });
  });
}

interface GoogleEvent { id: string; status?: string; summary?: string; recurringEventId?: string; start?: { dateTime?: string; date?: string }; end?: { dateTime?: string; date?: string }; }
const toIso = (value?: { dateTime?: string; date?: string }) => value?.dateTime ? new Date(value.dateTime).toISOString() : value?.date ? new Date(`${value.date}T00:00`).toISOString() : undefined;

export type GoogleEventDraft = Omit<Draft<CalendarEvent>, 'areaId' | 'projectId'> & { externalId: string };

export async function fetchGoogleEvents(token: string, from: Date, to: Date): Promise<GoogleEventDraft[]> {
  const params = new URLSearchParams({ timeMin: from.toISOString(), timeMax: to.toISOString(), singleEvents: 'true', orderBy: 'startTime', maxResults: '250' });
  const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`, { headers: { Authorization: `Bearer ${token}` } });
  if (response.status === 401) throw new Error('Token do Google inválido ou expirado. Conecte de novo.');
  if (!response.ok) throw new Error(`O Google Calendar respondeu com erro ${response.status}.`);
  const body = (await response.json()) as { items?: GoogleEvent[] };
  return (body.items ?? []).flatMap(item => {
    const startsAt = toIso(item.start); const endsAt = toIso(item.end);
    if (!startsAt || !endsAt) return [];
    return [{ title: item.summary?.trim() || 'Compromisso sem título', startsAt, endsAt, status: item.status === 'cancelled' ? 'cancelled' : 'confirmed', source: 'google', externalId: item.id, recurrenceId: item.recurringEventId }];
  });
}
