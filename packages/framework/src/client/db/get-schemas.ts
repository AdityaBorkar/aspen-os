import * as authSchema from "../auth/db-schema";
import * as kvStoreSchema from "../kv-store/db-schema";
import * as logSchema from "../logs/db-schema";
import * as storageSchema from "../storage/db-schema";

export function getSchemas() {
  const schemas = {
    ...authSchema,
    ...logSchema,
    ...storageSchema,
    ...kvStoreSchema,
  };

  return schemas;
}
