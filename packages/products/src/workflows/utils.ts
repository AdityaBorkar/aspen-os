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
