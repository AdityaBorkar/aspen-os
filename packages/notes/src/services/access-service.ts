import type { NotesAccess } from "#/utils/constants";

import { getContext } from "@aspen-os/platform/server";
import { sql } from "drizzle-orm";

export interface AccessScopedRow {
  access: NotesAccess;
  ownerId: string;
}

const ADMIN_ROLE = "admin";

export function assertCanAccess(row: AccessScopedRow, actorId: string | undefined): void {
  if (!actorId) {
    throw new Error("Authentication required");
  }
  if (row.access !== "global" && row.ownerId !== actorId) {
    throw new Error("You do not have access to this note");
  }
}

export async function assertCanMutate(
  row: AccessScopedRow,
  actorId: string | undefined,
): Promise<void> {
  if (!actorId) {
    throw new Error("Authentication required");
  }
  if (row.ownerId === actorId) {
    return;
  }
  if (await isTenantAdmin(actorId)) {
    return;
  }
  throw new Error("Only the owner or a tenant admin can modify this note");
}

export function resolveActorId(actorId: string | undefined, explicit?: string): string {
  if (explicit) {
    return explicit;
  }
  if (!actorId) {
    throw new Error("Authentication required");
  }
  return actorId;
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
