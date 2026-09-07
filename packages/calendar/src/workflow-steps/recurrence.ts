import type { EventRecurrenceRow } from "#/db-schemas/event";
import type { OccurrencesQuery } from "#/schemas";
import type {
  EventStatus,
  RecurrenceFrequency,
  ReminderInterval,
  Weekday,
} from "#/utils/constants";

export interface Occurrence {
  calendarId: string;
  endsAt: Date | null;
  eventId: string;
  /**
   * Occurrence identity. Occurrences are computed on read and never
   * materialized, so an occurrence shares its source event's id.
   */
  id: string;
  location: string | null;
  startsAt: Date;
  status: EventStatus;
  title: string;
}

export interface OccurrenceSource {
  calendarId: string;
  endsAt: Date | null;
  id: string;
  location: string | null;
  recurrence: EventRecurrenceRow | null;
  startsAt: Date;
  status: EventStatus;
  title: string;
}

const WEEKDAY_INDEX = {
  FR: 5,
  MO: 1,
  SA: 6,
  SU: 0,
  TH: 4,
  TU: 2,
  WE: 3,
} satisfies Record<Weekday, number>;

/**
 * Single date-shift primitive behind both recurrence expansion and reminder
 * rescheduling. One table, one switch — add new calendar units here.
 */
export function addFrequency(date: Date, frequency: RecurrenceFrequency, interval: number): Date {
  const next = new Date(date);
  switch (frequency) {
    case "daily": {
      next.setDate(next.getDate() + interval);
      break;
    }
    case "weekly": {
      next.setDate(next.getDate() + 7 * interval);
      break;
    }
    case "monthly": {
      next.setMonth(next.getMonth() + interval);
      break;
    }
    case "yearly": {
      next.setFullYear(next.getFullYear() + interval);
      break;
    }
  }
  return next;
}

function weekStart(anchor: Date): Date {
  const start = new Date(anchor);
  start.setDate(start.getDate() - anchor.getDay());
  start.setHours(0, 0, 0, 0);
  return start;
}

function toOccurrence(event: OccurrenceSource, startsAt: Date): Occurrence {
  const duration = event.endsAt ? event.endsAt.getTime() - event.startsAt.getTime() : null;

  return {
    calendarId: event.calendarId,
    endsAt: duration !== null ? new Date(startsAt.getTime() + duration) : null,
    eventId: event.id,
    id: event.id,
    location: event.location,
    startsAt,
    status: event.status,
    title: event.title,
  };
}

export interface OccurrenceRange {
  from: Date;
  limit: number;
  to: Date;
}

const DEFAULT_OCCURRENCE_LIMIT = 100;

/**
 * Applies listing defaults for an occurrence query: unbounded past/future
 * with a page cap. Shared by single-event and multi-event occurrence reads.
 */
export function resolveOccurrenceRange(query: OccurrencesQuery): OccurrenceRange {
  return {
    from: query.from ?? new Date(0),
    limit: query.limit ?? DEFAULT_OCCURRENCE_LIMIT,
    to: query.to ?? new Date("9999-12-31T23:59:59.999Z"),
  };
}

/**
 * Expands an event's recurrence into occurrences within `[range.from,
 * range.to]`, capped by `range.limit`. Non-recurring events yield their single
 * occurrence. Weekly recurrences with `byDay` produce occurrences on the
 * listed weekdays. Occurrences are computed on read — never materialized.
 */
export function expandOccurrences(event: OccurrenceSource, range: OccurrenceRange): Occurrence[] {
  const { from, limit, to } = range;
  if (limit <= 0 || Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from > to) {
    return [];
  }
  const results: Occurrence[] = [];
  const { recurrence } = event;

  if (!recurrence) {
    const start = new Date(event.startsAt);
    if (start >= from && start <= to) {
      results.push(toOccurrence(event, start));
    }
    return results;
  }

  const { frequency } = recurrence;
  const interval = recurrence.interval ?? 1;
  const anchor = new Date(event.startsAt);
  const until = recurrence.until ? new Date(recurrence.until) : null;
  const count = recurrence.count ?? null;

  let occurrences = 0;

  if (frequency === "weekly" && recurrence.byDay && recurrence.byDay.length > 0) {
    const anchorWeek = weekStart(anchor);
    const dayOffsets = [...new Set(recurrence.byDay.map((day) => WEEKDAY_INDEX[day]))].toSorted(
      (left, right) => left - right,
    );

    for (let week = 0; results.length < limit; week++) {
      const weekStartsAt = addFrequency(anchorWeek, "weekly", interval * week);

      for (const offset of dayOffsets) {
        const candidate = new Date(weekStartsAt);
        candidate.setDate(candidate.getDate() + offset);
        candidate.setHours(
          anchor.getHours(),
          anchor.getMinutes(),
          anchor.getSeconds(),
          anchor.getMilliseconds(),
        );

        if (week === 0 && candidate < anchor) {
          continue;
        }
        if ((until && candidate > until) || candidate > to) {
          return results;
        }

        occurrences++;
        if (count !== null && occurrences > count) {
          return results;
        }
        if (candidate >= from) {
          results.push(toOccurrence(event, candidate));
          if (results.length >= limit) {
            return results;
          }
        }
      }
    }

    return results;
  }

  let cursor = new Date(anchor);
  while (results.length < limit) {
    if ((count !== null && occurrences >= count) || (until && cursor > until) || cursor > to) {
      break;
    }

    occurrences++;
    if (cursor >= from) {
      results.push(toOccurrence(event, cursor));
    }
    cursor = addFrequency(cursor, frequency, interval);
  }

  return results;
}

/**
 * Next fire time for a recurring reminder. The interval is a validated
 * `ReminderInterval` — callers decode the free-text `interval` column at the
 * boundary and handle unknown values explicitly instead of a silent null.
 */
export function computeNextOccurrence(current: Date, interval: ReminderInterval): Date {
  const next = new Date(current);

  switch (interval) {
    case "daily":
    case "weekly":
    case "monthly": {
      return addFrequency(next, interval, 1);
    }
    case "every_2_hours": {
      next.setHours(next.getHours() + 2);
      return next;
    }
    default: {
      const exhaustive: never = interval;
      throw new Error(`Unknown reminder interval: ${String(exhaustive)}`);
    }
  }
}
