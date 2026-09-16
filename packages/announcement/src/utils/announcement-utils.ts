import { announcement } from "#/db-schemas";
import type { AnnouncementAudience, AnnouncementAudienceType } from "#/db-schemas/announcement";
import type { Db } from "#/workflows/db";
import { collectSubtreeIds } from "#/workflows/trees";

import { eq, sql } from "drizzle-orm";

export interface ResolvedRecipient {
  employeeId: string | null;
  hrUserId: string | null;
  userId: string | null;
}

export interface ResolvedAudienceDefinition {
  ids: string[];
  type: AnnouncementAudienceType;
}

export function resolveAudienceDefinition(input: {
  audience: AnnouncementAudience | null | undefined;
}): ResolvedAudienceDefinition {
  if (!input.audience) {
    throw new Error("Announcement audience is required.");
  }
  if (
    input.audience.type !== "all" &&
    input.audience.type !== "hr_users" &&
    (input.audience.ids?.length ?? 0) === 0
  ) {
    throw new Error(`Audience type "${input.audience.type}" requires at least one id.`);
  }
  return { ids: input.audience.ids ?? [], type: input.audience.type };
}

export async function fetchAnnouncementById(db: Db, id: string) {
  const [result] = await db.select().from(announcement).where(eq(announcement.id, id)).limit(1);

  if (!result) {
    throw new Error(`Announcement with id "${id}" not found.`);
  }

  return result;
}

function inList(ids: string[]) {
  return sql.join(
    ids.map((id) => sql`${id}`),
    sql`, `,
  );
}

async function resolveEmployees(db: Db, employeeIds: string[]): Promise<ResolvedRecipient[]> {
  if (employeeIds.length === 0) {
    return [];
  }

  // NOTE: employee and hr_user are owned by @aspen-os/hr-core. Their drizzle
  // tables cannot be imported here: hr-core is a raw-src package whose
  // declarations reference the package-local `#/*` alias, which would resolve
  // to this package's own sources. Query the tables directly so the
  // dependency stays one-directional (module `$dependencies = ["hrCore"]`).
  const employeeRows = await db.execute<{ id: string }>(
    sql`SELECT id FROM employee WHERE id IN (${inList(employeeIds)})`,
  );
  const foundIds = new Set(employeeRows.map((row) => row.id));

  const hrUserRows = await db.execute<{
    employeeId: string;
    hrUserId: string;
    userId: string;
  }>(
    sql`SELECT id AS "hrUserId", user_id AS "userId", employee_id AS "employeeId" FROM hr_user WHERE employee_id IN (${inList(employeeIds)})`,
  );
  const hrUserByEmployeeId = new Map(hrUserRows.map((row) => [row.employeeId, row]));

  const recipients: ResolvedRecipient[] = [];
  for (const id of employeeIds) {
    if (!foundIds.has(id)) {
      continue;
    }
    const linkedHrUser = hrUserByEmployeeId.get(id);
    if (linkedHrUser) {
      recipients.push({
        employeeId: id,
        hrUserId: linkedHrUser.hrUserId,
        userId: linkedHrUser.userId,
      });
    } else {
      recipients.push({ employeeId: id, hrUserId: null, userId: null });
    }
  }
  return recipients;
}

function dedupeRecipients(recipients: ResolvedRecipient[]): ResolvedRecipient[] {
  const seen = new Set<string>();
  const result: ResolvedRecipient[] = [];
  for (const recipient of recipients) {
    const key = recipient.employeeId ?? recipient.hrUserId ?? "";
    if (key === "" || seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(recipient);
  }
  return result;
}

async function expandDepartmentIds(db: Db, departmentIds: string[]): Promise<string[]> {
  const all = await db.execute<{ id: string; parentId: string | null }>(
    sql`SELECT id, parent_department AS "parentId" FROM department`,
  );
  return collectSubtreeIds(all, departmentIds);
}

async function resolveHrUsers(db: Db, hrUserIds: string[]): Promise<ResolvedRecipient[]> {
  if (hrUserIds.length === 0) {
    return [];
  }

  const rows = await db.execute<{ hrUserId: string; userId: string }>(
    sql`SELECT id AS "hrUserId", user_id AS "userId" FROM hr_user WHERE id IN (${inList(hrUserIds)})`,
  );

  return rows.map((row) => ({ employeeId: null, hrUserId: row.hrUserId, userId: row.userId }));
}

export async function resolveRecipients(
  db: Db,
  input: { audience: AnnouncementAudience | null | undefined },
): Promise<ResolvedRecipient[]> {
  const { ids, type } = resolveAudienceDefinition(input);
  const recipients: ResolvedRecipient[] = [];
  const pushEmployees = async (employeeIds: string[]): Promise<void> => {
    recipients.push(...(await resolveEmployees(db, employeeIds)));
  };

  if (type === "all") {
    const activeEmployees = await db.execute<{ id: string }>(
      sql`SELECT id FROM employee WHERE status = 'active'`,
    );
    await pushEmployees(activeEmployees.map((row) => row.id));
  } else if (type === "employees") {
    await pushEmployees(ids);
  } else if (type === "branches") {
    if (ids.length > 0) {
      const rows = await db.execute<{ id: string }>(
        sql`SELECT id FROM employee WHERE branch IN (${inList(ids)})`,
      );
      await pushEmployees(rows.map((row) => row.id));
    }
  } else if (type === "departments") {
    const expandedIds = await expandDepartmentIds(db, ids);
    if (expandedIds.length > 0) {
      const rows = await db.execute<{ id: string }>(
        sql`SELECT id FROM employee WHERE department IN (${inList(expandedIds)})`,
      );
      await pushEmployees(rows.map((row) => row.id));
    }
  } else if (type === "designations") {
    if (ids.length > 0) {
      const rows = await db.execute<{ id: string }>(
        sql`SELECT id FROM employee WHERE designation IN (${inList(ids)})`,
      );
      await pushEmployees(rows.map((row) => row.id));
    }
  } else if (type === "groups") {
    if (ids.length > 0) {
      const memberRows = await db.execute<{ employeeId: string }>(
        sql`SELECT employee_id AS "employeeId" FROM employee_group_member WHERE group_id IN (${inList(ids)})`,
      );
      const employeeIds = [...new Set(memberRows.map((row) => row.employeeId))];
      await pushEmployees(employeeIds);
    }
  } else if (type === "hr_users") {
    const activeHrUsers = await db.execute<{ hrUserId: string; userId: string }>(
      sql`SELECT id AS "hrUserId", user_id AS "userId" FROM hr_user WHERE is_active = true`,
    );
    recipients.push(
      ...activeHrUsers.map((row) => ({
        employeeId: null,
        hrUserId: row.hrUserId,
        userId: row.userId,
      })),
    );
  } else if (type === "roles") {
    if (ids.length > 0) {
      const userRoleRows = await db.execute<{ hrUserId: string }>(
        sql`SELECT hr_user_id AS "hrUserId" FROM hr_user_role WHERE role_id IN (${inList(ids)})`,
      );
      const hrUserIds = [...new Set(userRoleRows.map((row) => row.hrUserId))];
      recipients.push(...(await resolveHrUsers(db, hrUserIds)));
    }
  } else if (type === "individuals") {
    recipients.push(...(await resolveHrUsers(db, ids)));
  }

  return dedupeRecipients(recipients);
}

function missingIds(ids: string[], foundIds: Set<string>): string[] {
  return ids.filter((id) => !foundIds.has(id));
}

function throwOnMissing(ids: string[], foundIds: Set<string>, label: string): void {
  const missing = missingIds(ids, foundIds);
  if (missing.length > 0) {
    throw new Error(`${label}: ${missing.join(", ")}`);
  }
}

export async function validateAudienceStrongRefs(
  db: Db,
  type: AnnouncementAudienceType,
  ids: string[],
): Promise<void> {
  if (ids.length === 0) {
    return;
  }

  if (type === "employees") {
    const rows = await db.execute<{ id: string }>(
      sql`SELECT id FROM employee WHERE id IN (${inList(ids)})`,
    );
    throwOnMissing(ids, new Set(rows.map((row) => row.id)), "Unknown employee ids");
  } else if (type === "individuals") {
    const rows = await db.execute<{ id: string }>(
      sql`SELECT id FROM hr_user WHERE id IN (${inList(ids)})`,
    );
    throwOnMissing(ids, new Set(rows.map((row) => row.id)), "Unknown HR user ids");
  } else if (type === "groups") {
    const rows = await db.execute<{ id: string }>(
      sql`SELECT id FROM employee_group WHERE id IN (${inList(ids)})`,
    );
    throwOnMissing(ids, new Set(rows.map((row) => row.id)), "Unknown employee group ids");
  } else if (type === "roles") {
    const rows = await db.execute<{ id: string }>(
      sql`SELECT id FROM hr_role WHERE id IN (${inList(ids)})`,
    );
    throwOnMissing(ids, new Set(rows.map((row) => row.id)), "Unknown HR role ids");
  }
}
