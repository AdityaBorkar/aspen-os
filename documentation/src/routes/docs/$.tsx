import { createFileRoute, notFound, redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import type * as PageTree from "fumadocs-core/page-tree";
import { useFumadocsLoader } from "fumadocs-core/source/client";
import { buttonVariants } from "fumadocs-ui/components/ui/button";
import { DocsLayout } from "fumadocs-ui/layouts/docs";
import {
  DocsBody,
  DocsDescription,
  DocsPage,
  DocsTitle,
  MarkdownCopyButton,
  ViewOptionsPopover,
} from "fumadocs-ui/layouts/docs/page";
import { getLayoutTabs, type LayoutTab } from "fumadocs-ui/layouts/shared";
import { MessageCircleIcon } from "lucide-react";
import { Suspense } from "react";

import {
  AISearch,
  AISearchPanel,
  AISearchTrigger,
} from "@/components/ai/search";
import { useMDXComponents } from "@/components/mdx";
import { createClientLoader, mergedEntries } from "@/lib/client-loader";
import { cn } from "@/lib/cn";
import { baseOptions } from "@/lib/layout.shared";
import { resolveContentPath } from "@/lib/paths";
import { gitConfig } from "@/lib/shared";

export const Route = createFileRoute("/docs/$")({
  component: Page,
  loader: async ({ params }) => {
    const slugs = params._splat?.split("/") ?? [];
    if (slugs.length === 0 || (slugs.length === 1 && slugs[0] === "")) {
      throw redirect({ params: { _splat: "framework" }, to: "/docs/$" });
    }
    const data = await serverLoader({ data: slugs });
    await clientLoader.preload(data.path);
    return data;
  },
});

const serverLoader = createServerFn({
  method: "GET",
})
  .validator((slugs: string[]) => slugs)
  .handler(async ({ data: slugs }) => {
    const { source, slugsToMarkdownPath } = await import("@/lib/source");
    const page = source.getPage(slugs);
    if (!page) throw notFound();

    return {
      markdownUrl: slugsToMarkdownPath(page.slugs).url,
      pageTree: await source.serializePageTree(source.getPageTree()),
      path: page.path,
    };
  });

const clientLoader = createClientLoader(mergedEntries, {
  component(
    { toc, frontmatter, default: MDX },
    { markdownUrl, path }: { markdownUrl: string; path: string },
  ) {
    // biome-ignore lint/correctness/useHookAtTopLevel: framework component function
    const components = useMDXComponents();
    return (
      <DocsPage toc={toc}>
        <DocsTitle>{frontmatter.title}</DocsTitle>
        <DocsDescription>{frontmatter.description}</DocsDescription>
        <div className="-mt-4 flex flex-row items-center gap-2 border-b pb-6">
          <MarkdownCopyButton markdownUrl={markdownUrl} />
          <ViewOptionsPopover
            githubUrl={`https://github.com/${gitConfig.user}/${gitConfig.repo}/blob/${gitConfig.branch}/${resolveContentPath(path)}`}
            markdownUrl={markdownUrl}
          />
        </div>
        <DocsBody>
          <MDX components={components} />
        </DocsBody>
      </DocsPage>
    );
  },
});

function collectFolderUrls(folder: PageTree.Folder): Set<string> {
  const urls = new Set<string>();
  if (folder.index) urls.add(folder.index.url);
  for (const child of folder.children) {
    if (child.type === "page") urls.add(child.url);
    else if (child.type === "folder") {
      for (const url of collectFolderUrls(child)) urls.add(url);
    }
  }
  return urls;
}

function Page() {
  const { path, pageTree, markdownUrl } = useFumadocsLoader(
    Route.useLoaderData(),
  );

  return (
    <DocsLayout
      {...baseOptions()}
      tabs={getLayoutTabs(pageTree, {
        transform: (option, node): LayoutTab | null => ({
          ...option,
          $folder: undefined,
          urls: collectFolderUrls(node),
        }),
      })}
      tree={pageTree}
    >
      <AISearch>
        <AISearchPanel />
        <AISearchTrigger
          className={cn(
            buttonVariants({
              className: "rounded-2xl text-fd-muted-foreground",
              variant: "secondary",
            }),
          )}
          position="float"
        >
          <MessageCircleIcon className="size-4.5" />
          Ask AI
        </AISearchTrigger>
      </AISearch>

      <Suspense>
        {clientLoader.useContent(path, { markdownUrl, path })}
      </Suspense>
    </DocsLayout>
  );
}
