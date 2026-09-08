export const BRANCH_TYPE = {
  FACTORY: "factory",
  HEADQUARTERS: "headquarters",
  OFFICE: "office",
  OTHER: "other",
  REMOTE: "remote",
  STORE: "store",
  WAREHOUSE: "warehouse",
} as const;

export type BranchType = (typeof BRANCH_TYPE)[keyof typeof BRANCH_TYPE];
