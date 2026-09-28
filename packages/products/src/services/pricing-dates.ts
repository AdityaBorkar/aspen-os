export function toDateKey(value: Date): string {
  const [key] = value.toISOString().split("T");
  if (key === undefined) {
    throw new Error("Unable to derive a date key.");
  }
  return key;
}

export function todayKey(): string {
  return toDateKey(new Date());
}

export function dateKeyToDate(key: string): Date {
  return new Date(`${key}T00:00:00.000Z`);
}
