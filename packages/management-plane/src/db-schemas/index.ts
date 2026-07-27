export * from "./audit-log";
export * from "./organization";
export * from "./service-provider";
export * from "./tenant";
export * from "./user";

import { auditLog } from "./audit-log";
import { serviceProvider } from "./service-provider";
import { tenant } from "./tenant";

export const control_plane_schemas = {
  auditLog,
  serviceProvider,
  tenant,
} as const;

export const tenant_schemas = {} as const;
