import { DataTable, WORKFLOW_COLUMNS } from "#/components/ref-tables";
import { WorkflowDiagram } from "#/components/ref-workflow-diagram";
import { getWorkflowAnchor, getWorkflowKey, REF_DATA } from "#/lib/ref";

import { createFileRoute } from "@tanstack/react-router";
import { DocsBody, DocsDescription, DocsPage, DocsTitle } from "fumadocs-ui/layouts/docs/page";
import { useCallback, useState } from "react";

export const Route = createFileRoute("/ref/workflows")({
  component: RefWorkflowsPage,
});

type WorkflowView = "diagram" | "table";

function WorkflowViewToggle({
  onDiagram,
  onTable,
  view,
}: {
  onDiagram: () => void;
  onTable: () => void;
  view: WorkflowView;
}) {
  return (
    <div
      aria-label="Workflows view"
      className="mb-4 inline-flex rounded-md border p-1"
      role="tablist"
    >
      <button
        aria-selected={view === "table"}
        className={
          view === "table"
            ? "rounded bg-fd-primary px-3 py-1 text-sm font-medium text-fd-primary-foreground"
            : "rounded px-3 py-1 text-sm text-fd-muted-foreground hover:text-fd-foreground"
        }
        onClick={onTable}
        role="tab"
        type="button"
      >
        Table View
      </button>
      <button
        aria-selected={view === "diagram"}
        className={
          view === "diagram"
            ? "rounded bg-fd-primary px-3 py-1 text-sm font-medium text-fd-primary-foreground"
            : "rounded px-3 py-1 text-sm text-fd-muted-foreground hover:text-fd-foreground"
        }
        onClick={onDiagram}
        role="tab"
        type="button"
      >
        Diagram View
      </button>
    </div>
  );
}

function RefWorkflowsPage() {
  const [view, setView] = useState<WorkflowView>("table");
  const showTable = useCallback(() => {
    setView("table");
  }, []);
  const showDiagram = useCallback(() => {
    setView("diagram");
  }, []);

  return (
    <DocsPage full={view === "diagram"}>
      <DocsTitle>Workflows</DocsTitle>
      <DocsDescription>
        {REF_DATA.workflows.length} Workflow.name(...) from packages/*/src/workflows/**/*.ts. Pick a
        module to explore its hierarchy.
      </DocsDescription>
      <DocsBody>
        <WorkflowViewToggle onDiagram={showDiagram} onTable={showTable} view={view} />
        {view === "diagram" ? (
          <WorkflowDiagram workflows={REF_DATA.workflows} />
        ) : (
          <DataTable
            columns={WORKFLOW_COLUMNS}
            getAnchor={getWorkflowAnchor}
            getKey={getWorkflowKey}
            rows={REF_DATA.workflows}
          />
        )}
      </DocsBody>
    </DocsPage>
  );
}
