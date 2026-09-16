import { REF_ROUTE } from "#/lib/constants";
import { CONTENT_TABS, REF_DATA } from "#/lib/ref";

import { createFileRoute, Link } from "@tanstack/react-router";
import { DocsBody, DocsDescription, DocsPage, DocsTitle } from "fumadocs-ui/layouts/docs/page";

export const Route = createFileRoute("/ref/")({
  component: RefOverviewPage,
});

function RefOverviewPage() {
  return (
    <DocsPage>
      <DocsTitle>Reference</DocsTitle>
      <DocsDescription>
        Auto-generated from <code>packages/*</code> via <code>scripts/generate-ref.ts</code>. Pick a
        section.
      </DocsDescription>
      <DocsBody>
        <ul>
          <li>
            <Link className="underline" to="/ref/summary">
              Summary
            </Link>{" "}
            — all {REF_DATA.modules.length} modules grouped in one accordion with indented schemas,
            db schemas, workflows, steps, and events
          </li>
          {CONTENT_TABS.map((tab) => (
            <li key={tab.slug}>
              <Link className="underline" to={tab.url}>
                {tab.label}
              </Link>{" "}
              — {tab.blurb(REF_DATA)}
            </li>
          ))}
        </ul>
        <p className="text-sm text-fd-muted-foreground">
          Endpoint: <code>{`${REF_ROUTE}/*`}</code>. Each table row is anchored (e.g.{" "}
          <code>{REF_ROUTE}/workflows#task.create</code>). Data source is generated at build time
          (gitignored, verified with <code>bun run gen:ref --check</code>).
        </p>
      </DocsBody>
    </DocsPage>
  );
}
