import { kvStore } from "../../~kv-store/db-schema";
import * as notificationSchema from "../../~notification/schema";
import * as authSchema from "../../auth/db-schema";
import type { Framework } from "../../framework";
import * as logSchema from "../../logs/schema";
import * as storageSchema from "../../storage/db-schema";

export function getSchemas(framework: Framework) {
  const coreSchemas = {
    ...authSchema,
    ...logSchema,
    ...notificationSchema,
    ...storageSchema,
    kvStore,
  };

  const unitSchemas: Record<string, unknown> = {};
  const units = framework.getUnit() as Record<string, unknown>;
  for (const unit of Object.values(units)) {
    const unitAny = unit as Record<string, unknown>;
    if (unitAny?.db_schema && typeof unitAny.db_schema === "object") {
      Object.assign(unitSchemas, unitAny.db_schema);
    }
  }

  return { ...coreSchemas, ...unitSchemas };
}
