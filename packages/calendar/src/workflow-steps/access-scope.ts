import { calendarEvent, calendarReminder } from "#/db-schemas";
import { CALENDAR_AUDIENCE } from "#/utils/constants";
import type { CalendarAudienceType } from "#/utils/constants";

import type { WorkflowContext } from "@aspen-os/platform/server";
import { and, eq, inArray, or, sql } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import type { PgColumn } from "drizzle-orm/pg-core";

type CalendarDb = WorkflowContext["db"];

/**
 * Group ids the actor's linked employee belongs to. Employee groups live in
 * `@aspen-os/hr-core`, whose drizzle tables cannot be imported here (its
 * declarations reference a package-local `#/*` alias) — query them directly
 * so the dependency stays one-directional. Best-effort: when hr-core is not
 * installed the tables are absent and the actor simply has no groups.
 */
export async function actorGroupIds(db: CalendarDb, actorId: string): Promise<string[]> {
  try {
    const rows = await db.execute<{ groupId: string }>(
      sql`SELECT gm.group_id AS "groupId"
          FROM employee_group_member gm
          JOIN hr_user hu ON hu.employee_id = gm.employee_id
          WHERE hu.user_id = ${actorId}`,
    );
    return [...new Set(rows.map((row) => row.groupId))];
  } catch {
    return [];
  }
}

/** Visibility rule shared by events and reminders, given the actor's groups. */
function audienceMatch(params: {
  actorId: string;
  audienceId: PgColumn;
  audienceType: PgColumn;
  groupIds: string[];
}): SQL {
  const { actorId, audienceId, audienceType, groupIds } = params;
  const clauses: (SQL | undefined)[] = [
    eq(audienceType, CALENDAR_AUDIENCE.ORGANIZATION),
    and(eq(audienceType, CALENDAR_AUDIENCE.USER), eq(audienceId, actorId)),
  ];
  if (groupIds.length > 0) {
    clauses.push(and(eq(audienceType, CALENDAR_AUDIENCE.GROUP), inArray(audienceId, groupIds)));
  }
  return or(...clauses) ?? sql`false`;
}

/** Events visible to `actorId`: org-wide, their group, or addressed to them. */
export function visibleEventCondition(actorId: string, groupIds: string[]): SQL {
  return audienceMatch({
    actorId,
    audienceId: calendarEvent.audience_id,
    audienceType: calendarEvent.audience_type,
    groupIds,
  });
}

/** Reminders visible to `actorId`: org-wide, their group, or addressed to them. */
export function visibleReminderCondition(actorId: string, groupIds: string[]): SQL {
  return audienceMatch({
    actorId,
    audienceId: calendarReminder.audience_id,
    audienceType: calendarReminder.audience_type,
    groupIds,
  });
}

/**
 * Concrete user ids an audience resolves to at dispatch time. Goes through
 * hr-core-owned tables by raw SQL (see {@link actorGroupIds}).
 */
export async function audienceRecipientUserIds(
  db: CalendarDb,
  audienceType: CalendarAudienceType,
  audienceId: string | null,
): Promise<string[]> {
  try {
    if (audienceType === CALENDAR_AUDIENCE.ORGANIZATION) {
      const rows = await db.execute<{ userId: string }>(
        sql`SELECT user_id AS "userId" FROM hr_user WHERE is_active = true`,
      );
      return [...new Set(rows.map((row) => row.userId))];
    }
    if (audienceType === CALENDAR_AUDIENCE.GROUP) {
      if (!audienceId) {
        return [];
      }
      const rows = await db.execute<{ userId: string }>(
        sql`SELECT hu.user_id AS "userId"
            FROM employee_group_member gm
            JOIN hr_user hu ON hu.employee_id = gm.employee_id
            WHERE gm.group_id = ${audienceId} AND hu.is_active = true`,
      );
      return [...new Set(rows.map((row) => row.userId))];
    }
    if (audienceType === CALENDAR_AUDIENCE.USER && audienceId) {
      return [audienceId];
    }
  } catch {
    return [];
  }
  return [];
}

/**
 * LIKE's default escape character. `escapeLikePattern` uses it to escape `%`,
 * `_`, and itself so user search input matches literally inside a
 * `LIKE`/`ILIKE` pattern.
 */
const LIKE_ESCAPE = "\\";

export function escapeLikePattern(value: string): string {
  return value
    .replaceAll(LIKE_ESCAPE, `${LIKE_ESCAPE}${LIKE_ESCAPE}`)
    .replaceAll("%", `${LIKE_ESCAPE}%`)
    .replaceAll("_", `${LIKE_ESCAPE}_`);
}
