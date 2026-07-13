import { docsRoute } from "./shared";

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
    url: `${docsRoute}/${segments.join("/")}`,
  };
}

const contentPathMap: Record<string, string> = {
  compliance: "packages/compliance/docs-www",
  framework: "packages/framework/docs-www",
  organization: "packages/organization/docs-www",
};

export function resolveContentPath(path: string): string {
  const slashIdx = path.indexOf("/");
  if (slashIdx === -1) return `content/docs/${path}`;
  const prefix = path.slice(0, slashIdx);
  const rest = path.slice(slashIdx + 1);
  const mapped = contentPathMap[prefix];
  return mapped ? `${mapped}/${rest}` : `content/docs/${path}`;
}
