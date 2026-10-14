import {publicAiringConflict} from './public-airing-conflicts.mjs';
import type {Anime} from './types';

export type LibraryAiringState = 'ongoing' | 'completed' | 'upcoming' | 'unknown';
export type IsoWeekday = 1 | 2 | 3 | 4 | 5 | 6 | 7;
export const libraryAiringOrder: readonly LibraryAiringState[] = ['ongoing', 'completed', 'upcoming', 'unknown'];
export type AiringOptions = {now: number; timeZone: string};
/** Only already-returned, trusted public rows belong in this index, never merged saved payloads. */
export type PublicAiringRow = Readonly<Pick<Anime, 'key' | 'bgm' | 'date' | 'format' | 'end' | 'broadcast'>>;
export type AiringSchedule = {
  kind: 'weekly' | 'non-weekly' | 'unknown';
  nextAt: string | null;
  weekday: IsoWeekday | null;
  localTime: string | null;
  timeZone: string;
};
export type LibraryAiring = {
  key: string;
  state: LibraryAiringState;
  basis: 'end-instant' | 'final-release' | 'future-premiere' | 'dated-interval' | 'recurring-schedule' | 'unknown';
  certainty: 'source-asserted' | 'scheduled' | 'unknown';
  reason: 'end-reached' | 'final-release-reached' | 'future-premiere' | 'dated-interval' | 'source-schedule' |
    'source-evidence-conflict' | 'missing-public-evidence' | 'identity-mismatch' | 'invalid-now' | 'invalid-premiere' | 'invalid-end' |
    'invalid-chronology' | 'non-series' | 'missing-premiere' | 'premiere-time-unconfirmed' | 'insufficient-evidence';
  schedule: AiringSchedule;
};

const DAY = 86_400_000;
const WEEK = 7 * DAY;
const MAX_INSTANT = 253_402_300_799_999; // Last millisecond of four-digit ISO year 9999.
const WEEKDAYS: Record<string, IsoWeekday> = {Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7};
const validNow = (now: number) => Number.isSafeInteger(now) && now >= 0 && now <= MAX_INSTANT;
const emptySchedule = (timeZone: string, kind: AiringSchedule['kind'] = 'unknown'): AiringSchedule =>
  ({kind, nextAt: null, weekday: null, localTime: null, timeZone});

/** Full Gregorian date only; unlike Date.parse this rejects normalization of February 30. */
function dateMidnight(value: string | undefined): number | null {
  const match = typeof value === 'string' && /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match || Number(match[1]) < 1) return null;
  const date = new Date(0);
  date.setUTCFullYear(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return date.toISOString().slice(0, 10) === value ? date.getTime() : null;
}

/** The current source supplies offset-bearing instants, not floating or date-only ends. */
function sourceInstant(value: string | undefined): number | null {
  const match = typeof value === 'string' && /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?(Z|([+-])(\d{2}):(\d{2}))$/.exec(value);
  if (!match) return null;
  const midnight = dateMidnight(match[1]);
  const [hour, minute, second] = [Number(match[2]), Number(match[3]), Number(match[4] || 0)];
  const offsetHours = Number(match[7] ? match[8] : 0);
  const offsetMinutes = Number(match[7] ? match[9] : 0);
  if (midnight === null || hour > 23 || minute > 59 || second > 59 || offsetHours > 23 || offsetMinutes > 59) return null;
  const offset = (offsetHours * 60 + offsetMinutes) * (match[7] === '-' ? -1 : 1);
  const valueMs = midnight + ((hour * 60 + minute - offset) * 60 + second) * 1000 + Number((match[5] || '').padEnd(3, '0'));
  return Number.isSafeInteger(valueMs) && valueMs <= MAX_INSTANT ? valueMs : null;
}

function weeklyAnchor(broadcast: string | undefined): number | null {
  const match = typeof broadcast === 'string' && /^R\/(.+)\/P7D$/.exec(broadcast);
  return match ? sourceInstant(match[1]) : null;
}

/**
 * Fixed-instant weekly recurrence, not a local wall-clock rule. All weekday filters,
 * groups and labels must consume this same next occurrence, including across DST.
 * An occurrence exactly at now is included; a known end is an inclusive boundary.
 */
export function nextWeeklyOccurrence(broadcast: string | undefined, options: AiringOptions & {end?: string}): AiringSchedule {
  const {now, timeZone, end} = options;
  const anchor = weeklyAnchor(broadcast);
  const endedAt = end ? sourceInstant(end) : null;
  if (!validNow(now) || (end && endedAt === null)) return emptySchedule(timeZone);
  if (endedAt !== null && now >= endedAt) return emptySchedule(timeZone, 'non-weekly');
  if (anchor === null) return emptySchedule(timeZone, broadcast && !/^R\//.test(broadcast) ? 'non-weekly' : 'unknown');
  const next = anchor + Math.max(0, Math.ceil((now - anchor) / WEEK)) * WEEK;
  if (!Number.isSafeInteger(next) || next > MAX_INSTANT || (endedAt !== null && next > endedAt)) return emptySchedule(timeZone);
  try {
    if (!timeZone) return emptySchedule(timeZone);
    const parts = new Intl.DateTimeFormat('en-US', {timeZone, weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'}).formatToParts(next);
    const part = (type: Intl.DateTimeFormatPartTypes) => parts.find(value => value.type === type)?.value;
    const weekday = WEEKDAYS[part('weekday') || ''];
    const hour = part('hour');
    const minute = part('minute');
    if (!weekday || !hour || !minute) return emptySchedule(timeZone);
    return {kind: 'weekly', nextAt: new Date(next).toISOString(), weekday, localTime: `${hour}:${minute}`, timeZone};
  } catch {
    // An invalid/unsupported IANA zone must not silently become UTC or crash the shelf.
    return emptySchedule(timeZone);
  }
}

/** Public release classification is independent of saved viewing state, scores and provider listings. */
export function projectLibraryAiring(key: string, publicByKey: ReadonlyMap<string, PublicAiringRow>, options: AiringOptions): LibraryAiring {
  const {now, timeZone} = options;
  const result: LibraryAiring = {key, state: 'unknown', basis: 'unknown', certainty: 'unknown', reason: 'insufficient-evidence', schedule: emptySchedule(timeZone)};
  const unknown = (reason: LibraryAiring['reason']) => ({...result, reason});
  if (!validNow(now)) return unknown('invalid-now');
  const row = publicByKey.get(key);
  if (!row) return unknown('missing-public-evidence');
  if (row.key !== key || (key.startsWith('bgm:') && (!/^bgm:[1-9]\d*$/.test(key) || !Number.isSafeInteger(Number(key.slice(4))) || (row.bgm !== undefined && key !== `bgm:${row.bgm}`)))) return unknown('identity-mismatch');
  if (publicAiringConflict(row, now)) return unknown('source-evidence-conflict');
  const premiere = dateMidnight(row.date);
  if (row.date && premiere === null) return unknown('invalid-premiere');
  const format = row.format.toLowerCase();
  const movie = ['movie', '剧场版', '电影'].includes(format);
  const finalRelease = ['ova', 'oad', '原创影像', '附赠动画'].includes(format);
  const series = ['tv', '电视动画', 'web', 'ona', '网络动画'].includes(format) || finalRelease;
  const end = series && row.end ? sourceInstant(row.end) : null;
  if (series && row.end && end === null) return unknown('invalid-end');
  const anchor = weeklyAnchor(row.broadcast);
  if (end !== null && anchor !== null && end < anchor) return unknown('invalid-chronology');
  // A date-only premiere may belong to UTC+14. Adjacent UTC dates are not a conflict.
  if (premiere !== null && end !== null && end < premiere - 14 * 3_600_000) return unknown('invalid-chronology');
  if (end !== null && now >= end) return {...result, state: 'completed', basis: finalRelease ? 'final-release' : 'end-instant', certainty: 'source-asserted', reason: finalRelease ? 'final-release-reached' : 'end-reached', schedule: emptySchedule(timeZone, 'non-weekly')};
  if (movie || !series) result.schedule = emptySchedule(timeZone, 'non-weekly');
  const today = dateMidnight(new Date(now).toISOString().slice(0, 10))!;
  if (premiere !== null && premiere > today) return {...result, state: 'upcoming', basis: 'future-premiere', certainty: 'source-asserted', reason: 'future-premiere'};
  if (!series) return {...result, reason: 'non-series'};
  if (premiere === null) return unknown('missing-premiere');
  result.schedule = nextWeeklyOccurrence(row.broadcast, {...options, end: row.end});
  // Calendar precision alone does not establish that today's premiere has happened.
  if (premiere === today && (anchor === null || anchor > now || anchor < premiere - 14 * 3_600_000)) return {...result, reason: 'premiere-time-unconfirmed'};
  if (end !== null) return {...result, state: 'ongoing', basis: 'dated-interval', certainty: 'source-asserted', reason: 'dated-interval'};
  if (anchor !== null && anchor <= now) return {...result, state: 'ongoing', basis: 'recurring-schedule', certainty: 'scheduled', reason: 'source-schedule'};
  return result;
}

export type ProjectedLibraryItem<T> = {item: T; airing: LibraryAiring};
export type LibraryAiringGroup<T> = {
  state: LibraryAiringState;
  items: ProjectedLibraryItem<T>[];
  weekdays: Array<{weekday: IsoWeekday | null; items: ProjectedLibraryItem<T>[]}>
};
/** Deduplicates membership by exact key. Counts and filters should use these rows before pagination. */
export function groupLibraryAiring<T extends {key: string}>(saved: readonly T[], publicByKey: ReadonlyMap<string, PublicAiringRow>, options: AiringOptions, compare?: (a: T, b: T) => number): LibraryAiringGroup<T>[] {
  const seen = new Set<string>();
  const rows = saved.filter(item => {if (seen.has(item.key)) return false; seen.add(item.key); return true;})
    .map(item => ({item, airing: projectLibraryAiring(item.key, publicByKey, options)}));
  const keyOrder = (a: T, b: T) => a.key < b.key ? -1 : a.key > b.key ? 1 : 0;
  return libraryAiringOrder.map(state => {
    const items = rows.filter(row => row.airing.state === state).sort((a, b) => {
      if (state === 'ongoing') {
        const day = (a.airing.schedule.weekday ?? 8) - (b.airing.schedule.weekday ?? 8);
        if (day) return day;
        const aTime = a.airing.schedule.localTime ?? '99:99';
        const bTime = b.airing.schedule.localTime ?? '99:99';
        if (aTime !== bTime) return aTime < bTime ? -1 : 1;
      }
      return (compare?.(a.item, b.item) || 0) || keyOrder(a.item, b.item);
    });
    const weekdays = state === 'ongoing' ? ([1, 2, 3, 4, 5, 6, 7, null] as const).flatMap(weekday => {
      const matches = items.filter(row => row.airing.schedule.weekday === weekday);
      return matches.length ? [{weekday, items: matches}] : [];
    }) : [];
    return {state, items, weekdays};
  });
}
