export const ORG_BRANCH_TYPE = {
  FACTORY: "factory",
  HEADQUARTERS: "headquarters",
  OFFICE: "office",
  OTHER: "other",
  REMOTE: "remote",
  STORE: "store",
  WAREHOUSE: "warehouse",
} as const;

export type OrgBranchType = (typeof ORG_BRANCH_TYPE)[keyof typeof ORG_BRANCH_TYPE];
