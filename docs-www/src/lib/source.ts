import * as TablerIcons from "@tabler/icons-react";
import * as serverCollections from "collections/server";
import type { LoaderPlugin } from "fumadocs-core/source";
import { loader } from "fumadocs-core/source";
import type { ReactElement } from "react";
import { createElement } from "react";

import { DOCS_ROUTE } from "./constants";

function tablerIconPlugin(): LoaderPlugin {
  function resolveIcon(icon: string | undefined) {
    if (!icon) return;
    const Icon = (TablerIcons as Record<string, unknown>)[icon] as
      | ((props: { size?: number }) => ReactElement)
      | undefined;
    if (!Icon) {
      console.warn(`[tabler-icons] Unknown icon: ${icon}`);
      return;
    }
    return createElement(Icon);
  }
  function replaceIcon<T extends { icon?: unknown }>(node: T): T {
    if (node.icon === undefined || typeof node.icon === "string") {
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
        if (!filePath) return node;
        const file = this.storage.read(filePath);
        if (
          file?.format === "page" &&
          "display" in file.data &&
          typeof file.data.display === "string"
        ) {
          node.name = file.data.display;
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
