export function stripUndefined<TValue extends Record<string, unknown>>(
  obj: TValue,
): Partial<TValue> {
  const result = {} as Record<string, unknown>;
  for (const key of Object.keys(obj)) {
    if (obj[key] !== undefined) {
      result[key] = obj[key];
    }
  }
  return result as Partial<TValue>;
}
