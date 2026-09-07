/**
 * Escapes LIKE wildcards so user input matches literally. PostgreSQL LIKE
 * treats backslash as the default escape character.
 */
export function escapeLike(value: string): string {
  return value
    .replaceAll("\\", String.raw`\\`)
    .replaceAll("%", String.raw`\%`)
    .replaceAll("_", String.raw`\_`);
}
