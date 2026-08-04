import { and, asc, eq, isNull } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { parse } from "valibot";

import { status, statusTransition } from "../db-schema";
import type {
  CreateStatusInput,
  CreateStatusTransitionInput,
  UpdateStatusInput,
} from "../types";
import {
  CreateStatusSchema,
  CreateStatusTransitionSchema,
  UpdateStatusSchema,
} from "../types";

export interface StatusServiceDeps {
  db: NodePgDatabase;
}

export async function createStatus(
  input: CreateStatusInput,
  deps: StatusServiceDeps,
) {
  const { db } = deps;
  const parsed = parse(CreateStatusSchema, input);

  if (parsed.isDefault) {
    await unsetDefault(parsed.projectId ?? null, deps);
  }

  const [result] = await db
    .insert(status)
    .values({
      category: parsed.category,
      color: parsed.color ?? null,
      isDefault: parsed.isDefault ?? false,
      isResolved: parsed.isResolved ?? false,
      name: parsed.name,
      projectId: parsed.projectId ?? null,
      sortOrder: parsed.sortOrder ?? 0,
    })
    .returning();

  return result;
}

export async function updateStatus(
  id: string,
  patch: UpdateStatusInput,
  deps: StatusServiceDeps,
) {
  const { db } = deps;
  await getStatusById(id, deps);
  const parsed = parse(UpdateStatusSchema, patch);

  if (parsed.isDefault) {
    const [current] = await db
      .select({ projectId: status.projectId })
      .from(status)
      .where(eq(status.id, id))
      .limit(1);
    if (current) {
      await unsetDefault(current.projectId, deps);
    }
  }

  const [updated] = await db
    .update(status)
    .set({
      category: parsed.category,
      color: parsed.color,
      isDefault: parsed.isDefault,
      isResolved: parsed.isResolved,
      name: parsed.name,
      sortOrder: parsed.sortOrder,
    })
    .where(eq(status.id, id))
    .returning();

  return updated;
}

export async function deleteStatus(id: string, deps: StatusServiceDeps) {
  const { db } = deps;
  await db.delete(status).where(eq(status.id, id));
}

export async function getStatusById(id: string, deps: StatusServiceDeps) {
  const { db } = deps;
  const [result] = await db
    .select()
    .from(status)
    .where(eq(status.id, id))
    .limit(1);

  if (!result) {
    throw new Error(`Status with id "${id}" not found.`);
  }

  return result;
}

export async function listStatuses(
  projectId: string | undefined,
  deps: StatusServiceDeps,
) {
  const { db } = deps;
  const conditions = projectId ? eq(status.projectId, projectId) : undefined;

  return db
    .select()
    .from(status)
    .where(conditions)
    .orderBy(asc(status.sortOrder));
}

export async function getGlobalStatuses(deps: StatusServiceDeps) {
  const { db } = deps;
  return db
    .select()
    .from(status)
    .where(isNull(status.projectId))
    .orderBy(asc(status.sortOrder));
}

export async function createTransition(
  input: CreateStatusTransitionInput,
  deps: StatusServiceDeps,
) {
  const { db } = deps;
  const parsed = parse(CreateStatusTransitionSchema, input);

  if (parsed.fromStatusId === parsed.toStatusId) {
    throw new Error("From and to status cannot be the same.");
  }

  const [result] = await db
    .insert(statusTransition)
    .values({
      fromStatusId: parsed.fromStatusId,
      projectId: parsed.projectId,
      requiresComment: parsed.requiresComment ?? false,
      requiresRole: parsed.requiresRole ?? null,
      toStatusId: parsed.toStatusId,
    })
    .returning();

  return result;
}

export async function deleteTransition(id: string, deps: StatusServiceDeps) {
  const { db } = deps;
  await db.delete(statusTransition).where(eq(statusTransition.id, id));
}

export async function listTransitions(
  projectId: string,
  deps: StatusServiceDeps,
) {
  const { db } = deps;
  return db
    .select()
    .from(statusTransition)
    .where(eq(statusTransition.projectId, projectId));
}

export async function validateTransition(
  fromStatusId: string,
  toStatusId: string,
  projectId: string,
  deps: StatusServiceDeps,
): Promise<boolean> {
  const { db } = deps;
  const [transition] = await db
    .select({ id: statusTransition.id })
    .from(statusTransition)
    .where(
      and(
        eq(statusTransition.fromStatusId, fromStatusId),
        eq(statusTransition.toStatusId, toStatusId),
        eq(statusTransition.projectId, projectId),
      ),
    )
    .limit(1);

  if (transition) return true;

  const anyTransition = await db
    .select({ id: statusTransition.id })
    .from(statusTransition)
    .where(eq(statusTransition.projectId, projectId))
    .limit(1);

  return anyTransition.length === 0;
}

async function unsetDefault(
  projectId: string | null,
  deps: StatusServiceDeps,
): Promise<void> {
  const { db } = deps;
  await db
    .update(status)
    .set({ isDefault: false })
    .where(
      projectId === null
        ? isNull(status.projectId)
        : eq(status.projectId, projectId),
    );
}
