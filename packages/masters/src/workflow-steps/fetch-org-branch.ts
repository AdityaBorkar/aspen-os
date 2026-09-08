import { orgBranch } from "#/db-schemas";
import type { OrgBranch } from "#/db-schemas/org-branch";
import { defineFetchByIdStep } from "#/workflow-steps/fetch-by-id";

export const fetchOrgBranchStep = defineFetchByIdStep<OrgBranch>({
  idColumn: orgBranch.id,
  label: "Org branch",
  stepName: "masters-fetch-org-branch",
  table: orgBranch,
});

// Deprecated alias — prefer fetchOrgBranchStep.
export const fetchBranchStep = fetchOrgBranchStep;
