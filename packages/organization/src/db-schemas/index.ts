import { branch } from "#/db-schemas/branch";
import { organization } from "#/db-schemas/organization";

export { branch, branchTypeEnum } from "#/db-schemas/branch";
export { organization, organizationStatusEnum } from "#/db-schemas/organization";

export const control_plane_schemas = {} as const;

export const tenant_schemas = {
  branch,
  organization,
} as const;
