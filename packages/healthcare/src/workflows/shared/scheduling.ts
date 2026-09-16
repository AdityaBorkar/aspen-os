export const WEEKDAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

export type WeekdayKey = (typeof WEEKDAY_KEYS)[number];

export const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function toMinutes(hhmm: string): number {
  const [hours, minutes] = hhmm.split(":").map(Number);
  return (hours ?? 0) * 60 + (minutes ?? 0);
}

export function toHHMM(mins: number): string {
  return `${String(Math.floor(mins / 60)).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`;
}

export function slotLabel(datePart: string, mins: number): string {
  return `${datePart}T${toHHMM(mins)}:00`;
}

export function weekdayKeyOf(date: string): WeekdayKey {
  // SAFETY: DATE_PATTERN callers validate YYYY-MM-DD first; getUTCDay always
  // yields 0-6 and WEEKDAY_KEYS covers every index.
  const key = WEEKDAY_KEYS[new Date(`${date}T00:00:00Z`).getUTCDay()];
  return key ?? "sun";
}

export function assertDateString(date: string): void {
  if (!DATE_PATTERN.test(date)) {
    throw new Error(`Date "${date}" must be YYYY-MM-DD.`);
  }
}

export interface TimeRange {
  from: Date;
  to: Date;
}

export function intervalsOverlap(first: TimeRange, second: TimeRange): boolean {
  return first.from < second.to && second.from < first.to;
}

export function dateWithinRange(date: string, from: string, to: string): boolean {
  return from <= date && date <= to;
}
