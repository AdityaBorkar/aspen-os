import {
  department,
  employee,
  employeeGroup,
  employeeGroupMember,
  hrAnnouncement,
  hrRole,
  hrUser,
  hrUserRole,
} from "#/db-schemas";
import type { AnnouncementAudience, AnnouncementAudienceType } from "#/db-schemas/announcement";
import type { Db } from "#/workflows/db";
import { collectSubtreeIds } from "#/workflows/trees";

import { eq, inArray } from "drizzle-orm";

export type AnnouncementChannel = "custom" | "general" | "hr";

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
  audience: AnnouncementAudience | null;
  channel: AnnouncementChannel;
}): ResolvedAudienceDefinition {
  if (input.channel === "general") {
    return { ids: [], type: "all" };
  }
  if (input.channel === "hr") {
    return { ids: [], type: "hr_users" };
  }
  if (!input.audience) {
    throw new Error("Custom-channel announcements require an audience definition.");
  }
  if (input.audience.type !== "all" && (input.audience.ids?.length ?? 0) === 0) {
    throw new Error(`Audience type "${input.audience.type}" requires at least one id.`);
  }
  return { ids: input.audience.ids ?? [], type: input.audience.type };
}

export async function fetchAnnouncementById(db: Db, id: string) {
  const [result] = await db.select().from(hrAnnouncement).where(eq(hrAnnouncement.id, id)).limit(1);

  if (!result) {
    throw new Error(`Announcement with id "${id}" not found.`);
  }

  return result;
}

async function resolveEmployees(db: Db, employeeIds: string[]): Promise<ResolvedRecipient[]> {
  if (employeeIds.length === 0) {
    return [];
  }

  const employeeRows = await db
    .select({ id: employee.id })
    .from(employee)
    .where(inArray(employee.id, employeeIds));

  const foundIds = new Set(employeeRows.map((row) => row.id));

  const hrUserRows = await db
    .select({ employeeId: hrUser.employeeId, hrUserId: hrUser.id, userId: hrUser.userId })
    .from(hrUser)
    .where(inArray(hrUser.employeeId, employeeIds));

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
  const all = await db
    .select({ id: department.id, parentId: department.parentDepartment })
    .from(department);
  return collectSubtreeIds(all, departmentIds);
}

async function resolveHrUsers(db: Db, hrUserIds: string[]): Promise<ResolvedRecipient[]> {
  if (hrUserIds.length === 0) {
    return [];
  }

  const rows = await db
    .select({ hrUserId: hrUser.id, userId: hrUser.userId })
    .from(hrUser)
    .where(inArray(hrUser.id, hrUserIds));

  return rows.map((row) => ({ employeeId: null, hrUserId: row.hrUserId, userId: row.userId }));
}

export async function resolveRecipients(
  db: Db,
  input: { audience: AnnouncementAudience | null; channel: AnnouncementChannel },
): Promise<ResolvedRecipient[]> {
  const { ids, type } = resolveAudienceDefinition(input);
  const recipients: ResolvedRecipient[] = [];
  const pushEmployees = async (employeeIds: string[]): Promise<void> => {
    recipients.push(...(await resolveEmployees(db, employeeIds)));
  };

  if (type === "all") {
    const activeEmployees = await db
      .select({ id: employee.id })
      .from(employee)
      .where(eq(employee.status, "active"));
    await pushEmployees(activeEmployees.map((row) => row.id));
  } else if (type === "employees") {
    await pushEmployees(ids);
  } else if (type === "branches") {
    const rows = await db
      .select({ id: employee.id })
      .from(employee)
      .where(inArray(employee.branch, ids));
    await pushEmployees(rows.map((row) => row.id));
  } else if (type === "departments") {
    const expandedIds = await expandDepartmentIds(db, ids);
    const rows = await db
      .select({ id: employee.id })
      .from(employee)
      .where(inArray(employee.department, expandedIds));
    await pushEmployees(rows.map((row) => row.id));
  } else if (type === "designations") {
    const rows = await db
      .select({ id: employee.id })
      .from(employee)
      .where(inArray(employee.designation, ids));
    await pushEmployees(rows.map((row) => row.id));
  } else if (type === "groups") {
    const memberRows = await db
      .select({ employeeId: employeeGroupMember.employeeId })
      .from(employeeGroupMember)
      .where(inArray(employeeGroupMember.groupId, ids));
    const employeeIds = [...new Set(memberRows.map((row) => row.employeeId))];
    await pushEmployees(employeeIds);
  } else if (type === "hr_users") {
    const activeHrUsers = await db
      .select({ hrUserId: hrUser.id, userId: hrUser.userId })
      .from(hrUser)
      .where(eq(hrUser.isActive, true));
    recipients.push(
      ...activeHrUsers.map((row) => ({
        employeeId: null,
        hrUserId: row.hrUserId,
        userId: row.userId,
      })),
    );
  } else if (type === "roles") {
    const userRoleRows = await db
      .select({ hrUserId: hrUserRole.hrUserId })
      .from(hrUserRole)
      .where(inArray(hrUserRole.roleId, ids));
    const hrUserIds = [...new Set(userRoleRows.map((row) => row.hrUserId))];
    recipients.push(...(await resolveHrUsers(db, hrUserIds)));
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
    const rows = await db
      .select({ id: employee.id })
      .from(employee)
      .where(inArray(employee.id, ids));
    throwOnMissing(ids, new Set(rows.map((row) => row.id)), "Unknown employee ids");
  } else if (type === "individuals") {
    const rows = await db.select({ id: hrUser.id }).from(hrUser).where(inArray(hrUser.id, ids));
    throwOnMissing(ids, new Set(rows.map((row) => row.id)), "Unknown HR user ids");
  } else if (type === "groups") {
    const rows = await db
      .select({ id: employeeGroup.id })
      .from(employeeGroup)
      .where(inArray(employeeGroup.id, ids));
    throwOnMissing(ids, new Set(rows.map((row) => row.id)), "Unknown employee group ids");
  } else if (type === "roles") {
    const rows = await db.select({ id: hrRole.id }).from(hrRole).where(inArray(hrRole.id, ids));
    throwOnMissing(ids, new Set(rows.map((row) => row.id)), "Unknown HR role ids");
  }
}
