import { DataTable, WORKFLOW_STEP_COLUMNS } from "#/components/ref-tables";
import { getWorkflowStepAnchor, getWorkflowStepKey, REF_DATA } from "#/lib/ref";

import { createFileRoute } from "@tanstack/react-router";
import { DocsBody, DocsDescription, DocsPage, DocsTitle } from "fumadocs-ui/layouts/docs/page";

export const Route = createFileRoute("/ref/workflow-steps")({
  component: RefWorkflowStepsPage,
});

function RefWorkflowStepsPage() {
  return (
    <DocsPage>
      <DocsTitle>Workflow Steps</DocsTitle>
      <DocsDescription>
        {REF_DATA.workflowSteps.length} WorkflowStep.name(...) from
        packages/*/src/workflow-steps/**/*.ts
      </DocsDescription>
      <DocsBody>
        <DataTable
          columns={WORKFLOW_STEP_COLUMNS}
          getAnchor={getWorkflowStepAnchor}
          getKey={getWorkflowStepKey}
          rows={REF_DATA.workflowSteps}
        />
      </DocsBody>
    </DocsPage>
  );
}
