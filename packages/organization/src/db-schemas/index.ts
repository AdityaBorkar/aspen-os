import { branch } from "#/db-schemas/branch";

export { branch, branchTypeEnum } from "#/db-schemas/branch";

export const control_plane_schemas = {} as const;

export const tenant_schemas = {
  branch,
} as const;
