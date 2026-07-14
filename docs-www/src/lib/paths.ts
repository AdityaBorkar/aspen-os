import { DOCS_ROUTE } from "./constants";

export function markdownPathToSlugs(segs: string[]) {
  if (segs.length === 0) return [];

  const out = [...segs];
  const last = out[out.length - 1];
  if (last !== undefined) {
    out[out.length - 1] = last.replace(/\.md$/, "");
  }
  if (out.length === 1 && out[0] === "index") out.pop();
  return out;
}

export function slugsToMarkdownPath(slugs: string[]) {
  const segments = [...slugs];
  if (segments.length === 0) {
    segments.push("index.md");
  } else {
    segments[segments.length - 1] += ".md";
  }

  return {
    segments,
    url: `${DOCS_ROUTE}/${segments.join("/")}`,
  };
}

export function resolveContentPath(path: string): string {
  const slashIdx = path.indexOf("/");
  if (slashIdx === -1) return `packages/${path}/docs-www`;
  return `packages/${path.slice(0, slashIdx)}/docs-www/${path.slice(slashIdx + 1)}`;
}
