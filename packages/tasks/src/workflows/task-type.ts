import { eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { parse } from "valibot";

import { label, taskType } from "../db-schema";
import type {
  CreateLabelInput,
  CreateTaskTypeInput,
  UpdateLabelInput,
  UpdateTaskTypeInput,
} from "../types";
import {
  CreateLabelSchema,
  CreateTaskTypeSchema,
  UpdateLabelSchema,
  UpdateTaskTypeSchema,
} from "../types";

export interface TaskTypeServiceDeps {
  db: NodePgDatabase;
}

export async function createTaskType(
  input: CreateTaskTypeInput,
  deps: TaskTypeServiceDeps,
) {
  const { db } = deps;
  const parsed = parse(CreateTaskTypeSchema, input);

  if (parsed.isDefault && parsed.projectId) {
    await unsetDefaultTaskType(parsed.projectId, deps);
  }

  const [result] = await db
    .insert(taskType)
    .values({
      color: parsed.color ?? null,
      icon: parsed.icon ?? null,
      isDefault: parsed.isDefault ?? false,
      name: parsed.name,
      projectId: parsed.projectId ?? null,
    })
    .returning();

  return result;
}

export async function updateTaskType(
  id: string,
  patch: UpdateTaskTypeInput,
  deps: TaskTypeServiceDeps,
) {
  const { db } = deps;
  const parsed = parse(UpdateTaskTypeSchema, patch);

  if (parsed.isDefault) {
    const [current] = await db
      .select({ projectId: taskType.projectId })
      .from(taskType)
      .where(eq(taskType.id, id))
      .limit(1);
    if (current?.projectId) {
      await unsetDefaultTaskType(current.projectId, deps);
    }
  }

  const [updated] = await db
    .update(taskType)
    .set({
      color: parsed.color,
      icon: parsed.icon,
      isDefault: parsed.isDefault,
      name: parsed.name,
    })
    .where(eq(taskType.id, id))
    .returning();

  return updated;
}

export async function deleteTaskType(id: string, deps: TaskTypeServiceDeps) {
  const { db } = deps;
  await db.delete(taskType).where(eq(taskType.id, id));
}

export async function listTaskTypes(
  projectId: string | undefined,
  deps: TaskTypeServiceDeps,
) {
  const { db } = deps;
  const conditions = projectId ? eq(taskType.projectId, projectId) : undefined;
  return db.select().from(taskType).where(conditions);
}

export async function createLabel(
  input: CreateLabelInput,
  deps: TaskTypeServiceDeps,
) {
  const { db } = deps;
  const parsed = parse(CreateLabelSchema, input);

  const [result] = await db
    .insert(label)
    .values({
      color: parsed.color ?? null,
      name: parsed.name,
      projectId: parsed.projectId ?? null,
    })
    .returning();

  return result;
}

export async function updateLabel(
  id: string,
  patch: UpdateLabelInput,
  deps: TaskTypeServiceDeps,
) {
  const { db } = deps;
  const parsed = parse(UpdateLabelSchema, patch);

  const [updated] = await db
    .update(label)
    .set({
      color: parsed.color,
      name: parsed.name,
    })
    .where(eq(label.id, id))
    .returning();

  return updated;
}

export async function deleteLabel(id: string, deps: TaskTypeServiceDeps) {
  const { db } = deps;
  await db.delete(label).where(eq(label.id, id));
}

export async function listLabels(
  projectId: string | undefined,
  deps: TaskTypeServiceDeps,
) {
  const { db } = deps;
  const conditions = projectId ? eq(label.projectId, projectId) : undefined;
  return db.select().from(label).where(conditions);
}

async function unsetDefaultTaskType(
  projectId: string,
  deps: TaskTypeServiceDeps,
): Promise<void> {
  const { db } = deps;
  await db
    .update(taskType)
    .set({ isDefault: false })
    .where(eq(taskType.projectId, projectId));
}
