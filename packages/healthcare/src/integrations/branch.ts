export const BRANCH_ROUTING_OWNERSHIP = "hc-foundation.healthcare_branch" as const;

export const ORG_BRANCH_OWNERSHIP = "masters.org-branch" as const;

export const MANAGEMENT_OWNERSHIP = "management.organization" as const;

export interface HealthcareBranchLink {
  branchId: string;
  orgBranchCode?: string | null;
  subdomain: string;
}

export function branchLink(
  branchId: string,
  subdomain: string,
  orgBranchCode?: string | null,
): HealthcareBranchLink {
  return { branchId, orgBranchCode: orgBranchCode ?? null, subdomain };
}
