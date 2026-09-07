import type { DatabaseUnit, JsonValue } from "@aspen-os/platform/server";
import { isGlobalTenantId } from "@aspen-os/platform/server";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { object, optional, safeParse, string } from "valibot";

/**
 * Canonical tenant routing for comms background work. `tenantId` is
 * load-bearing (it selects the database), so every reader goes through here:
 * - `tenantIdFromMetadata` returns null when absent (fail closed at call site).
 * - `requireTenantIdFromMetadata` throws instead of defaulting to "default".
 */

const TenantMetadataSchema = object({ tenantId: optional(string()) });

export function tenantIdFromMetadata(
  metadata: Record<string, JsonValue> | null | undefined,
): string | null {
  const parsed = safeParse(TenantMetadataSchema, metadata ?? {});
  if (!parsed.success || !parsed.output.tenantId) {
    return null;
  }
  return parsed.output.tenantId;
}

export function requireTenantIdFromMetadata(
  metadata: Record<string, JsonValue> | null | undefined,
  scope: string,
): string {
  const tenantId = tenantIdFromMetadata(metadata);
  if (!tenantId) {
    throw new Error(`Cannot route ${scope}: message metadata is missing tenantId.`);
  }
  return tenantId;
}

export async function runInTenantContext<TValue>(
  dbUnit: DatabaseUnit,
  tenantId: string,
  fn: (db: PostgresJsDatabase) => Promise<TValue>,
): Promise<TValue> {
  if (isGlobalTenantId(tenantId)) {
    return fn(dbUnit.controlPlaneDb);
  }
  if (dbUnit.tenancyMode === "isolated") {
    const db = await dbUnit.getTenantDb(tenantId);
    return fn(db);
  }
  // SAFETY: runWithTenant hands the callback a session-scoped drizzle instance
  // whose surface is a PostgresJsDatabase; the generic schema parameter is erased.
  return dbUnit.runWithTenant(tenantId, (db) => fn(db));
}
