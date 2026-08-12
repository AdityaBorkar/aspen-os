export function stripUndefined<T extends Record<string, unknown>>(
  obj: T,
): Partial<T> {
  const result = {} as Record<string, unknown>;
  for (const key of Object.keys(obj)) {
    if (obj[key] !== undefined) result[key] = obj[key];
  }
  return result as Partial<T>;
}
