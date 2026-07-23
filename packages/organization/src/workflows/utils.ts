export function stripUndefined<T extends Record<string, unknown>>(
  obj: T,
): Partial<T> {
  const result = {} as Record<string, unknown>;
  for (const key of Object.keys(obj)) {
    if (obj[key] !== undefined) result[key] = obj[key];
  }
  return result as Partial<T>;
}

export function generateSlug(name: string): string {
  const SLUG_MAX_LENGTH = 63;
  const slug = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return slug.slice(0, SLUG_MAX_LENGTH);
}
