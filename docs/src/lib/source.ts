import * as TablerIcons from "@tabler/icons-react";
import * as serverCollections from "collections/server";
import { loader } from "fumadocs-core/source";
import type { LoaderPlugin } from "fumadocs-core/source";
import { createElement } from "react";
import type { ElementType, ReactElement } from "react";

import { DOCS_ROUTE } from "./constants";

function resolveIcon(icon: string | undefined): ReactElement | undefined {
  if (!icon) {
    return undefined;
  }
  const iconMap = TablerIcons;
  // SAFETY: tabler icons exports only components, keyed by their icon names.
  const iconEntry = iconMap[icon as keyof typeof iconMap];
  if (!(iconEntry instanceof Function)) {
    console.warn(`[tabler-icons] Unknown icon: ${icon}`);
    return undefined;
  }
  // SAFETY: a callable tabler icons export is a renderable React component.
  return createElement(iconEntry as ElementType);
}

function tablerIconPlugin(): LoaderPlugin {
  function replaceIcon<TNode extends { icon?: unknown }>(node: TNode): TNode {
    if (node.icon === undefined || !(node.icon instanceof Function)) {
      // SAFETY: the icon field is an icon-name string or absent; component icons are left untouched.
      node.icon = resolveIcon(node.icon as string | undefined);
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
