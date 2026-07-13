import * as TablerIcons from "@tabler/icons-react";
import { compliance, docs, framework, organization } from "collections/server";
import type { LoaderPlugin } from "fumadocs-core/source";
import { loader } from "fumadocs-core/source";
import type { ReactElement } from "react";
import { createElement } from "react";

import { docsRoute } from "./shared";

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

export const source = loader(
  {
    compliance: compliance.toFumadocsSource({ baseDir: "compliance" }),
    framework: framework.toFumadocsSource({ baseDir: "framework" }),
    organization: organization.toFumadocsSource({ baseDir: "organization" }),
    root: docs.toFumadocsSource(),
  },
  {
    baseUrl: docsRoute,
    plugins: [tablerIconPlugin()],
  },
);

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

export async function getLLMText(page: (typeof source)["$inferPage"]) {
  const processed = await page.data.getText("processed");

  return `# ${page.data.title} (${page.url})

${processed}`;
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
