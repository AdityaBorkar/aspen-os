import browserCollections from "collections/browser";
import type { CompiledMDXProperties } from "fumadocs-mdx";
import { createClientLoader } from "fumadocs-mdx/runtime/browser";

type DocEntry = () => Promise<
  CompiledMDXProperties<{
    title: string;
    display?: string;
    description?: string;
    icon?: string;
    full?: boolean;
  }>
>;

function prefixEntries(
  prefix: string,
  entries: Record<string, DocEntry>,
): Record<string, DocEntry> {
  const out: Record<string, DocEntry> = {};
  for (const key in entries) {
    const path = key.startsWith("./") ? key.slice(2) : key;
    const entry = entries[key];
    if (entry !== undefined) out[`${prefix}${path}`] = entry;
  }
  return out;
}

const mergedEntries: Record<string, DocEntry> = Object.fromEntries(
  Object.entries(browserCollections).flatMap(([name, collection]) => {
    const raw = collection.raw as Record<string, DocEntry>;
    return Object.entries(prefixEntries(`${name}/`, raw));
  }),
);

export { createClientLoader, type mergedEntries };
