import * as auditSchema from "#/server/audit/db-schema";
import * as authSchema from "#/server/auth/db-schema";
import * as kvStoreSchema from "#/server/kv-store/db-schema";
import * as logSchema from "#/server/log/db-schema";
import * as storageSchema from "#/server/storage/db-schema";
import * as workflowSchema from "#/server/workflows/db-schema";

export * from "#/server/audit/db-schema";
export * from "#/server/auth/db-schema";
export * from "#/server/kv-store/db-schema";
export * from "#/server/log/db-schema";
export * from "#/server/storage/db-schema";
export * from "#/server/workflows/db-schema";

export const db_schemas = {
  ...auditSchema,
  ...authSchema,
  ...kvStoreSchema,
  ...logSchema,
  ...storageSchema,
  ...workflowSchema,
} as const;
