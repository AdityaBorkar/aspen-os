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
  return Object.fromEntries(
    Object.entries(entries).map(([key, entry]) => {
      const path = key.startsWith("./") ? key.slice(2) : key;
      return [`${prefix}${path}`, entry];
    }),
  );
}

const mergedEntries: Record<string, DocEntry> = Object.fromEntries(
  Object.entries(browserCollections).flatMap(([name, collection]) => {
    // SAFETY: collections expose a raw import map of loaders keyed by their module paths.
    const raw = collection.raw as Record<string, DocEntry>;
    return Object.entries(prefixEntries(`${name}/`, raw));
  }),
);

export { createClientLoader, mergedEntries };
