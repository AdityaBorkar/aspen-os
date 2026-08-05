import * as auditLog from "./audit-log";
import * as organization from "./organization";
import * as serviceProvider from "./service-provider";
import * as tenant from "./tenant";
import * as user from "./user";

export * from "./audit-log";
export * from "./organization";
export * from "./service-provider";
export * from "./tenant";
export * from "./user";

export const control_plane_schemas = {
  ...auditLog,
  ...serviceProvider,
  ...tenant,
} as const;

export const tenant_schemas = {
  ...organization,
  ...user,
} as const;
