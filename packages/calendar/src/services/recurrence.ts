import type { EventRecurrenceRow } from "#/db-schemas/event";
import type { EventStatus, RecurrenceFrequency, Weekday } from "#/utils/constants";

export interface Occurrence {
  calendarId: string;
  endsAt: Date | null;
  eventId: string;
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

const DAY_CODES: Weekday[] = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];

const WEEKDAY_INDEX = {
  FR: 5,
  MO: 1,
  SA: 6,
  SU: 0,
  TH: 4,
  TU: 2,
  WE: 3,
} satisfies Record<Weekday, number>;

function addInterval(date: Date, frequency: RecurrenceFrequency, interval: number): Date {
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
  start.setDate(start.getDate() - WEEKDAY_INDEX[DAY_CODES[anchor.getDay()] ?? "SU"]);
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

/**
 * Expands an event's recurrence into occurrences within `[from, to]`, capped by
 * `limit`. Non-recurring events yield their single occurrence. Weekly
 * recurrences with `byDay` produce occurrences on the listed weekdays.
 * Occurrences are computed on read — never materialized.
 */
// oxlint-disable-next-line
export function expandOccurrences(
  event: OccurrenceSource,
  from: Date,
  to: Date,
  limit: number,
): Occurrence[] {
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
      const weekStartsAt = addInterval(anchorWeek, "weekly", interval * week);

      for (const offset of dayOffsets) {
        const candidate = new Date(weekStartsAt);
        candidate.setDate(candidate.getDate() + offset);

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
    cursor = addInterval(cursor, frequency, interval);
  }

  return results;
}

export function computeNextOccurrence(current: Date, interval: string): Date | null {
  const next = new Date(current);

  switch (interval) {
    case "daily": {
      next.setDate(next.getDate() + 1);
      return next;
    }
    case "weekly": {
      next.setDate(next.getDate() + 7);
      return next;
    }
    case "monthly": {
      next.setMonth(next.getMonth() + 1);
      return next;
    }
    case "yearly": {
      next.setFullYear(next.getFullYear() + 1);
      return next;
    }
    case "every_2_hours": {
      next.setHours(next.getHours() + 2);
      return next;
    }
    default: {
      return null;
    }
  }
}
