// `user` and `organization` are mirror schemas — they are NOT included in
// control_plane_schemas because the platform already owns those tables via
// better-auth. These mirrors exist so the management-plane can query/update
// those tables with full type safety. They must stay synchronized with the
// actual table definitions (see comments in each file).
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
