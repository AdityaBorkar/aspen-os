import * as authSchema from "../../auth/db-schema";
import type { Framework } from "../../framework";
import { kvStore } from "../../kv-store/db-schema";
import * as logSchema from "../../logs/schema";
import * as notificationSchema from "../../notification/schema";
import * as storageSchema from "../../storage/schema";

export function getSchemas(framework: Framework) {
  const coreSchemas = {
    ...authSchema,
    ...logSchema,
    ...notificationSchema,
    ...storageSchema,
    kvStore,
  };

  const unitSchemas: Record<string, unknown> = {};
  for (const unit of framework.getUnits()) {
    const unitAny = unit as unknown as Record<string, unknown>;
    if (unitAny.db_schema && typeof unitAny.db_schema === "object") {
      Object.assign(unitSchemas, unitAny.db_schema);
    }
  }

  return { ...coreSchemas, ...unitSchemas };
}
