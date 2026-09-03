import { WORKSPACE_ACCESS } from "#/utils/constants";
import type { WorkspaceAccess } from "#/utils/constants";

import { getContext } from "@aspen-os/platform/server";
import { sql } from "drizzle-orm";

export interface AccessScopedRow {
  access: WorkspaceAccess;
  ownerId: string;
}

const ADMIN_ROLE = "admin";

export function requireActorId(actorId: string | undefined): string {
  if (!actorId) {
    throw new Error("Authentication required");
  }
  return actorId;
}

export function assertCanAccess(row: AccessScopedRow, actorId: string | undefined): void {
  const actor = requireActorId(actorId);
  if (row.access !== WORKSPACE_ACCESS.GLOBAL && row.ownerId !== actor) {
    throw new Error("You do not have access to this item");
  }
}

export async function assertCanMutate(
  row: AccessScopedRow,
  actorId: string | undefined,
): Promise<void> {
  const actor = requireActorId(actorId);
  if (row.ownerId === actor) {
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
