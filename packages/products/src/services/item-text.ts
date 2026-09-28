/**
 * Best-effort HTML stripping for item descriptions. Destroys formatting by
 * design — the stored `clean_description` is plain searchable text, not
 * sanitized HTML. Callers that need markup must not use this.
 */
export function stripHtmlToText(input: string | null | undefined): string | null {
  if (input === null || input === undefined) {
    return null;
  }
  const withoutScripts = input.replace(/<script[\s\S]*?<\/script>/gi, "");
  const withoutStyles = withoutScripts.replace(/<style[\s\S]*?<\/style>/gi, "");
  const withoutTags = withoutStyles
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (withoutTags.length === 0) {
    return null;
  }
  return withoutTags;
}
