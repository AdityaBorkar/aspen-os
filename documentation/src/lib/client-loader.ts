import browserCollections from "collections/browser";
import type { CompiledMDXProperties } from "fumadocs-mdx";
import { createClientLoader } from "fumadocs-mdx/runtime/browser";

const { docs, framework, organization, compliance } = browserCollections;
type DocFrontmatter = {
  title: string;
  description?: string;
  icon?: string;
  full?: boolean;
};

type DocEntry = () => Promise<CompiledMDXProperties<DocFrontmatter>>;
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

const mergedEntries: Record<string, DocEntry> = {
  ...docs.raw,
  ...prefixEntries("framework/", framework.raw),
  ...prefixEntries("organization/", organization.raw),
  ...prefixEntries("compliance/", compliance.raw),
};

export { createClientLoader, mergedEntries };
