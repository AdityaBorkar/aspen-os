export * from "./audit/db-schema";
export * from "./auth/db-schema";
export * from "./kv-store/db-schema";
export * from "./log/db-schema";
export * from "./storage/db-schema";
export * from "./workflows/db-schema";

import * as auditSchema from "./audit/db-schema";
import * as authSchema from "./auth/db-schema";
import * as kvStoreSchema from "./kv-store/db-schema";
import * as logSchema from "./log/db-schema";
import * as storageSchema from "./storage/db-schema";
import * as workflowSchema from "./workflows/db-schema";

export const db_schemas = {
  ...auditSchema,
  ...authSchema,
  ...kvStoreSchema,
  ...logSchema,
  ...storageSchema,
  ...workflowSchema,
} as const;
