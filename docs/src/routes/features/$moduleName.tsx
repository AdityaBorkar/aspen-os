// TanStack Router derives the `$moduleName` route param from this filename, so the
// basename must stay a valid JS identifier instead of kebab-case.
import { useMDXComponents } from "#/components/mdx";
import { createClientLoader, mergedEntries } from "#/lib/client-loader";
import { APP_NAME, FEATURES_ROUTE, LAYOUT_BASE_OPTIONS } from "#/lib/constants";
import { slugsToMarkdownPath } from "#/lib/paths";
import { source } from "#/lib/source";
import { STAGE } from "#/lib/stage";

import { createFileRoute, Link, notFound, redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { DocsLayout } from "fumadocs-ui/layouts/docs";
import {
  DocsBody,
  DocsDescription,
  DocsPage,
  DocsTitle,
  MarkdownCopyButton,
} from "fumadocs-ui/layouts/docs/page";
import { Suspense } from "react";

export interface FeaturesModule {
  key: string;
  slug: string;
  title: string;
}

// Plain-string page tree (a serializable subset of fumadocs `PageTree.Root`, whose
// `ReactNode` fields cannot cross the server-function boundary).
export interface FeaturesTreeItem {
  name: string;
  type: "page";
  url: string;
}

export interface FeaturesTree {
  children: FeaturesTreeItem[];
  name: string;
}

function toKebab(value: string): string {
  return value
    .replace(/(?<lower>[a-z0-9])(?<upper>[A-Z])/g, "$<lower>-$<upper>")
    .replaceAll("_", "-")
    .toLowerCase();
}

const serverLoader = createServerFn({
  method: "GET",
})
  .validator((moduleName: string) => moduleName)
  .handler(async ({ data: moduleName }) => {
    const seen = new Set<string>();
    const modules: FeaturesModule[] = [];
    for (const page of source.getPages()) {
      if (page.slugs.length !== 2 || page.slugs[1] !== "features") {
        continue;
      }
      const [key] = page.slugs;
      if (key === undefined || seen.has(key)) {
        continue;
      }
      seen.add(key);
      const indexPage = source.getPage([key]);
      const title = indexPage?.data.title ?? key;
      modules.push({ key, slug: toKebab(key), title });
    }
    modules.sort((left, right) => {
      if (left.slug === "platform") {
        return -1;
      }
      if (right.slug === "platform") {
        return 1;
      }
      return left.title.localeCompare(right.title);
    });

    const requested = toKebab(moduleName);
    const current = modules.find((module) => module.slug === requested);
    if (!current) {
      throw notFound();
    }
    const page = source.getPage([current.key, "features"]);
    if (!page) {
      throw notFound();
    }
    const tree: FeaturesTree = {
      children: modules.map((module) => ({
        name: module.title,
        type: "page",
        url: `${FEATURES_ROUTE}/${module.slug}`,
      })),
      name: "Features",
    };
    return {
      docsIndexSplat: current.key,
      docsSplat: `${current.key}/features`,
      markdownUrl: slugsToMarkdownPath(page.slugs).url,
      moduleSlug: current.slug,
      moduleTitle: current.title,
      path: page.path,
      tree,
    };
  });

const clientLoader = createClientLoader(mergedEntries, {
  component(
    { default: MDXContent, frontmatter, toc },
    { docsSplat, markdownUrl }: { docsSplat: string; markdownUrl: string },
  ) {
    const components = useMDXComponents();
    return (
      <DocsPage toc={toc}>
        <DocsTitle>{frontmatter.title}</DocsTitle>
        <DocsDescription>{frontmatter.description}</DocsDescription>
        <div className="-mt-4 flex flex-row items-center gap-2 border-b pb-6">
          <MarkdownCopyButton markdownUrl={markdownUrl} />
          <Link
            className="text-fd-muted-foreground text-sm underline hover:text-fd-foreground"
            // oxlint-disable-next-line react-perf/jsx-no-new-object-as-prop -- each module links to its own docs page.
            params={{ _splat: docsSplat }}
            to="/docs/$"
          >
            View in docs
          </Link>
        </div>
        <DocsBody>
          <MDXContent components={components} />
        </DocsBody>
      </DocsPage>
    );
  },
});

const nav = {
  ...LAYOUT_BASE_OPTIONS.nav,
  title: (
    <>
      <img alt="" className="size-5" src={`/icon${STAGE && `.${STAGE}`}.png`} />
      {APP_NAME}
    </>
  ),
};

export const Route = createFileRoute("/features/$moduleName")({
  component: FeaturesPage,
  loader: async ({ params }) => {
    const data = await serverLoader({ data: params.moduleName });
    if (data.moduleSlug !== params.moduleName) {
      throw redirect({
        params: { moduleName: data.moduleSlug },
        to: "/features/$moduleName",
      });
    }
    await clientLoader.preload(data.path);
    return data;
  },
});

function FeaturesPage() {
  const data = Route.useLoaderData();
  return (
    // oxlint-disable-next-line react/jsx-props-no-spreading
    <DocsLayout {...LAYOUT_BASE_OPTIONS} nav={nav} tree={data.tree}>
      <p className="mb-4 text-fd-muted-foreground text-sm">
        <Link
          className="underline hover:text-fd-foreground"
          // oxlint-disable-next-line react-perf/jsx-no-new-object-as-prop -- each module links to its own docs index page.
          params={{ _splat: data.docsIndexSplat }}
          to="/docs/$"
        >
          {data.moduleTitle}
        </Link>
        {" / Features"}
      </p>
      <Suspense>
        {clientLoader.useContent(data.path, {
          docsSplat: data.docsSplat,
          markdownUrl: data.markdownUrl,
        })}
      </Suspense>
    </DocsLayout>
  );
}
