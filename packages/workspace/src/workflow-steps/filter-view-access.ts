import type { FilterViewAccess } from "#/utils/constants";
import { FILTER_VIEW_ACCESS } from "#/utils/constants";

import { getContext } from "@aspen-os/platform/server";
import { sql } from "drizzle-orm";

export interface FilterViewAccessScopedRow {
  access: FilterViewAccess;
  owner_id: string;
}

const ADMIN_ROLE = "admin";

export function requireActorId(actorId: string | undefined): string {
  if (!actorId) {
    throw new Error("Authentication required");
  }
  return actorId;
}

export function assertCanAccess(row: FilterViewAccessScopedRow, actorId: string | undefined): void {
  const actor = requireActorId(actorId);
  if (row.access !== FILTER_VIEW_ACCESS.GLOBAL && row.owner_id !== actor) {
    throw new Error("You do not have access to this item");
  }
}

export async function assertCanMutate(
  row: FilterViewAccessScopedRow,
  actorId: string | undefined,
): Promise<void> {
  const actor = requireActorId(actorId);
  if (row.owner_id === actor) {
    return;
  }
  if (await isTenantAdmin(actor)) {
    return;
  }
  throw new Error("Only the owner or a tenant admin can modify this item");
}

export function resolveActorId(actorId: string | undefined, explicit?: string): string {
  if (explicit) {
    return explicit;
  }
  return requireActorId(actorId);
}

export async function isTenantAdmin(actorId: string): Promise<boolean> {
  const { db } = getContext();
  try {
    const [row] = await db.execute<{ role: string | null }>(
      sql`SELECT role FROM "user" WHERE id = ${actorId}`,
    );
    return row?.role === ADMIN_ROLE;
  } catch {
    return false;
  }
}
