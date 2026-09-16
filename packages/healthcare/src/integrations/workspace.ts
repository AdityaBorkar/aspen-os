export const WORKSPACE_OWNERSHIP_FILTER_VIEW = "workspace.filter-view" as const;

export const WORKSPACE_OWNERSHIP_DASHBOARD = "workspace.dashboard" as const;

export const WORKSPACE_OWNERSHIP_SEARCH = "workspace.search" as const;

export interface HealthcareReportIntent {
  branchId: string;
  collection: string;
  healthcareReportId: string;
  name: string;
}

export interface HealthcareExplorerGrantIntent {
  branchId: string;
  granteeId: string;
  healthcareGrantId: string;
  scope: string;
}

export function workspaceReportScope(collection: string): string {
  return `healthcare.${collection}`;
}
