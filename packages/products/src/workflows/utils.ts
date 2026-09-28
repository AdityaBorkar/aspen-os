export interface PageInput {
  limit?: number;
  offset?: number;
}

/**
 * Guard SQL-bound pagination inputs. Every list workflow funnels through here
 * so negative limits/offsets fail loudly instead of producing empty slices.
 */
export function checkPage(page: PageInput): void {
  if (page.limit !== undefined && !(page.limit >= 0)) {
    throw new Error("limit must be >= 0.");
  }
  if (page.offset !== undefined && !(page.offset >= 0)) {
    throw new Error("offset must be >= 0.");
  }
}

/**
 * Escape LIKE wildcards so user search text matches literally. Interpolate
 * the result into like/ilike patterns to keep exact-match behavior for
 * `%`, `_`, and `\` instead of leaking wildcard semantics.
 */
export function escapeLike(search: string): string {
  return search.replace(/[%_\\]/g, (character) => `\\${character}`);
}
