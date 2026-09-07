export const MS_PER_DAY = 86_400_000;

export function toDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function addDays(base: Date, days: number): Date {
  return new Date(base.getTime() + days * MS_PER_DAY);
}

export function todayDateOnly(now: Date = new Date()): string {
  return toDateOnly(now);
}

export function futureDateOnly(days: number, now: Date = new Date()): string {
  return toDateOnly(addDays(now, days));
}

export function daysFromNow(days: number, now: Date = new Date()): Date {
  return addDays(now, days);
}

export function utcMonthStart(year: number, monthIndex: number, day = 1): Date {
  return new Date(Date.UTC(year, monthIndex, day));
}

export function utcMonthEnd(year: number, monthIndex: number): Date {
  return new Date(Date.UTC(year, monthIndex + 1, 0));
}

const monthLabelFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  timeZone: "UTC",
  year: "numeric",
});

export function formatMonthLabel(date: Date): string {
  return monthLabelFormatter.format(date);
}

export function lastDayOfMonth(year: number, monthIndex: number): number {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

export function addMonthsClamped(base: Date, months: number): Date {
  const candidate = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + months, 1));
  candidate.setUTCDate(
    Math.min(
      base.getUTCDate(),
      lastDayOfMonth(candidate.getUTCFullYear(), candidate.getUTCMonth()),
    ),
  );
  return candidate;
}
