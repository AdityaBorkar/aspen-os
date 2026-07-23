export * from "./audit-log";
export * from "./member";
export * from "./organization";
export * from "./service-provider";
export * from "./session";
export * from "./tenant";
export * from "./user";

import { auditLog } from "./audit-log";
import { serviceProvider } from "./service-provider";
import { tenant } from "./tenant";

export const schemas = {
  auditLog,
  serviceProvider,
  tenant,
} as const;
