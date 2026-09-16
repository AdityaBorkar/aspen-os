import { DataTable, EVENT_COLUMNS } from "#/components/ref-tables";
import { getEventAnchor, getEventKey, REF_DATA } from "#/lib/ref";

import { createFileRoute } from "@tanstack/react-router";
import { DocsBody, DocsDescription, DocsPage, DocsTitle } from "fumadocs-ui/layouts/docs/page";

export const Route = createFileRoute("/ref/events")({
  component: RefEventsPage,
});

function RefEventsPage() {
  return (
    <DocsPage>
      <DocsTitle>Events</DocsTitle>
      <DocsDescription>
        {REF_DATA.events.length} topics from packages/*/src/pubsub.ts
      </DocsDescription>
      <DocsBody>
        <DataTable
          columns={EVENT_COLUMNS}
          getAnchor={getEventAnchor}
          getKey={getEventKey}
          rows={REF_DATA.events}
        />
      </DocsBody>
    </DocsPage>
  );
}
