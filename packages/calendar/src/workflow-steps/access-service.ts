import { calendarEvent } from "#/db-schemas";
import { CALENDAR_AUDIENCE, REMINDER_TARGET } from "#/utils/constants";
import type { CalendarAudienceType } from "#/utils/constants";
import { actorGroupIds } from "#/workflow-steps/access-scope";

import type { WorkflowContext } from "@aspen-os/platform/server";
import { eq, sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

type CalendarDb = WorkflowContext["db"];

const ADMIN_ROLE = "admin";

export interface AudienceScopedRow {
  audience_id: string | null;
  audience_type: CalendarAudienceType;
}

export interface EventAccessRow extends AudienceScopedRow {
  created_by: string;
}

export interface ReminderAccessRow extends AudienceScopedRow {
  created_by: string;
  target_id: string;
  target_type: string;
}

async function matchesAudience(
  row: AudienceScopedRow,
  actorId: string,
  db: CalendarDb,
): Promise<boolean> {
  if (row.audience_type === CALENDAR_AUDIENCE.ORGANIZATION) {
    return true;
  }
  if (row.audience_type === CALENDAR_AUDIENCE.USER) {
    return row.audience_id === actorId;
  }
  if (row.audience_type === CALENDAR_AUDIENCE.GROUP && row.audience_id) {
    const groups = await actorGroupIds(db, actorId);
    return groups.includes(row.audience_id);
  }
  return false;
}

/** An event is readable by its creator, its audience, or a tenant admin. */
export async function assertCanAccessEvent(
  event: EventAccessRow,
  actorId: string | undefined,
  db: CalendarDb,
): Promise<void> {
  if (!actorId) {
    throw new Error("Authentication required");
  }
  if (event.created_by === actorId || (await matchesAudience(event, actorId, db))) {
    return;
  }
  if (await isTenantAdmin(db, actorId)) {
    return;
  }
  throw new Error("You do not have access to this event");
}

/** Only the event creator or a tenant admin may modify it. */
export async function assertCanMutateEvent(
  event: EventAccessRow,
  actorId: string | undefined,
  db: CalendarDb,
): Promise<void> {
  if (!actorId) {
    throw new Error("Authentication required");
  }
  if (event.created_by === actorId) {
    return;
  }
  if (await isTenantAdmin(db, actorId)) {
    return;
  }
  throw new Error("Only the creator or a tenant admin can modify this event");
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

export async function isTenantAdmin(db: PostgresJsDatabase, actorId: string): Promise<boolean> {
  try {
    const [row] = await db.execute<{ role: string | null }>(
      sql`SELECT role FROM "user" WHERE id = ${actorId}`,
    );
    return row?.role === ADMIN_ROLE;
  } catch {
    return false;
  }
}

/** A reminder is readable by its creator/audience or the audience of its event. */
export async function assertCanAccessReminder(
  reminder: ReminderAccessRow,
  actorId: string | undefined,
  db: CalendarDb,
): Promise<void> {
  if (!actorId) {
    throw new Error("Authentication required");
  }
  if (
    reminder.created_by === actorId ||
    (await matchesAudience(reminder, actorId, db)) ||
    (await isTenantAdmin(db, actorId))
  ) {
    return;
  }
  if (reminder.target_type === REMINDER_TARGET.EVENT) {
    const [event] = await db
      .select({
        audience_id: calendarEvent.audience_id,
        audience_type: calendarEvent.audience_type,
        created_by: calendarEvent.created_by,
      })
      .from(calendarEvent)
      .where(eq(calendarEvent.id, reminder.target_id))
      .limit(1);
    if (event) {
      await assertCanAccessEvent(event, actorId, db);
      return;
    }
  }
  throw new Error("You do not have access to this reminder");
}
