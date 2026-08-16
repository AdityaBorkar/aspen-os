import { calendar, calendarEvent } from "#/db-schemas";
import type { CalendarAccess } from "#/utils/constants";

import { getContext } from "@aspen-os/platform/server";
import { eq, sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

export interface AccessScopedRow {
  access: CalendarAccess;
  ownerId: string;
}

const ADMIN_ROLE = "admin";

export function assertCanAccess(row: AccessScopedRow, actorId: string | undefined): void {
  if (!actorId) {
    throw new Error("Authentication required");
  }
  if (row.access !== "global" && row.ownerId !== actorId) {
    throw new Error("You do not have access to this calendar");
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
  throw new Error("Only the owner or a tenant admin can modify this calendar");
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
    const result = await db.execute<{ role: string | null }>(
      sql`SELECT role FROM "user" WHERE id = ${actorId}`,
    );
    const [row] = result.rows;
    return row?.role === ADMIN_ROLE;
  } catch {
    return false;
  }
}

export interface ReminderAccessRow {
  targetId: string;
  targetType: string;
  userId: string;
}

export async function assertCanAccessReminder(
  reminder: ReminderAccessRow,
  actorId: string | undefined,
  db: NodePgDatabase,
): Promise<void> {
  if (!actorId) {
    throw new Error("Authentication required");
  }
  if (reminder.userId === actorId) {
    return;
  }
  if (reminder.targetType === "event") {
    const [event] = await db
      .select({ calendarId: calendarEvent.calendarId })
      .from(calendarEvent)
      .where(eq(calendarEvent.id, reminder.targetId))
      .limit(1);
    if (event) {
      const [cal] = await db
        .select()
        .from(calendar)
        .where(eq(calendar.id, event.calendarId))
        .limit(1);
      if (cal) {
        assertCanAccess(cal, actorId);
        return;
      }
    }
  }
  throw new Error("You do not have access to this reminder");
}
