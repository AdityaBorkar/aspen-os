import { SummaryView } from "#/components/ref-summary";
import { REF_DATA } from "#/lib/ref";

import { createFileRoute } from "@tanstack/react-router";
import { DocsBody, DocsDescription, DocsPage, DocsTitle } from "fumadocs-ui/layouts/docs/page";

export const Route = createFileRoute("/ref/summary")({
  component: RefSummaryPage,
});

function RefSummaryPage() {
  return (
    <DocsPage>
      <DocsTitle>Summary</DocsTitle>
      <DocsDescription>
        All {REF_DATA.modules.length} modules grouped in one accordion with indented schemas, db
        schemas, workflows, steps, and events.
      </DocsDescription>
      <DocsBody>
        <SummaryView data={REF_DATA} />
      </DocsBody>
    </DocsPage>
  );
}
