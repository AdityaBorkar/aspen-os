import * as TablerIcons from "@tabler/icons-react";
import type { TablerIcon } from "@tabler/icons-react";
import * as serverCollections from "collections/server";
import { loader } from "fumadocs-core/source";
import type { LoaderPlugin } from "fumadocs-core/source";
import { createElement } from "react";
import type { ReactElement } from "react";
import { z } from "zod";

import { DOCS_ROUTE } from "./constants";

// Tabler icon components are forwardRef exotic objects carrying a $$typeof marker,
// while the package namespace also holds a factory helper and export tables that do not.
const iconMap = new Map<string, TablerIcon>(
  Object.entries(TablerIcons).filter(
    (entry): entry is [string, TablerIcon] => "$$typeof" in entry[1],
  ),
);

function resolveIcon(icon: string | undefined): ReactElement | undefined {
  if (!icon) {
    return undefined;
  }
  const iconEntry = iconMap.get(icon);
  if (!iconEntry) {
    console.warn(`[tabler-icons] Unknown icon: ${icon}`);
    return undefined;
  }
  return createElement(iconEntry);
}

const iconNameSchema = z.string();

function tablerIconPlugin(): LoaderPlugin {
  function replaceIcon<TNode extends { icon?: unknown }>(node: TNode): TNode {
    const parsedIcon = iconNameSchema.safeParse(node.icon);
    if (parsedIcon.success || node.icon === undefined) {
      node.icon = resolveIcon(parsedIcon.success ? parsedIcon.data : undefined);
    }
    return node;
  }
  return {
    name: "tabler-icons",
    transformPageTree: {
      file: replaceIcon,
      folder: replaceIcon,
      separator: replaceIcon,
    },
  };
}

function displayTitlePlugin(): LoaderPlugin {
  return {
    name: "display-title",
    transformPageTree: {
      file(node, filePath) {
        if (!filePath) {
          return node;
        }
        const file = this.storage.read(filePath);
        if (file?.format === "page" && "display" in file.data && file.data.display !== undefined) {
          // SAFETY: the display frontmatter field, when present, is a string.
          node.name = file.data.display as string;
        }
        return node;
      },
    },
  };
}

const sources = Object.fromEntries(
  Object.entries(serverCollections).map(([name, collection]) => [
    name,
    collection.toFumadocsSource({ baseDir: name }),
  ]),
);

export const source = loader(sources, {
  baseUrl: DOCS_ROUTE,
  plugins: [tablerIconPlugin(), displayTitlePlugin()],
});

export async function getLLMText(page: (typeof source)["$inferPage"]) {
  const processed = await page.data.getText("processed");
  return `# ${page.data.title} (${page.url})\n\n${processed}`;
}
