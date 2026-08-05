import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { parse } from "valibot";

import { label, taskType } from "../db-schema";
import type { UpdateLabelInput, UpdateTaskTypeInput } from "../types";
import {
  CreateLabelSchema,
  CreateTaskTypeSchema,
  UpdateLabelSchema,
  UpdateTaskTypeSchema,
} from "../types";

type DrizzleDB = NodePgDatabase<Record<string, never>>;

async function unsetDefaultTaskType(
  db: DrizzleDB,
  projectId: string,
): Promise<void> {
  await db
    .update(taskType)
    .set({ isDefault: false })
    .where(eq(taskType.projectId, projectId));
}

const createTaskType = Workflow.name("task-type.create")
  .input(CreateTaskTypeSchema)
  .handler(async (parsed, ctx) => {
    if (parsed.isDefault && parsed.projectId) {
      await unsetDefaultTaskType(ctx.db, parsed.projectId);
    }

    const [result] = await ctx.db
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
  });

const updateTaskType = Workflow.name("task-type.update").handler(
  async (input: { id: string; patch: UpdateTaskTypeInput }, ctx) => {
    const parsed = parse(UpdateTaskTypeSchema, input.patch);

    if (parsed.isDefault) {
      const [current] = await ctx.db
        .select({ projectId: taskType.projectId })
        .from(taskType)
        .where(eq(taskType.id, input.id))
        .limit(1);
      if (current?.projectId) {
        await unsetDefaultTaskType(ctx.db, current.projectId);
      }
    }

    const [updated] = await ctx.db
      .update(taskType)
      .set({
        color: parsed.color,
        icon: parsed.icon,
        isDefault: parsed.isDefault,
        name: parsed.name,
      })
      .where(eq(taskType.id, input.id))
      .returning();

    return updated;
  },
);

const deleteTaskType = Workflow.name("task-type.delete").handler(
  async (input: { id: string }, ctx) => {
    await ctx.db.delete(taskType).where(eq(taskType.id, input.id));
  },
);

const listTaskTypes = Workflow.name("task-type.list").handler(
  async (input: { projectId?: string }, ctx) => {
    return ctx.step.run("query", async () => {
      const conditions = input.projectId
        ? eq(taskType.projectId, input.projectId)
        : undefined;
      return ctx.db.select().from(taskType).where(conditions);
    });
  },
);

const createLabel = Workflow.name("task-type.create-label")
  .input(CreateLabelSchema)
  .handler(async (parsed, ctx) => {
    const [result] = await ctx.db
      .insert(label)
      .values({
        color: parsed.color ?? null,
        name: parsed.name,
        projectId: parsed.projectId ?? null,
      })
      .returning();

    return result;
  });

const updateLabel = Workflow.name("task-type.update-label").handler(
  async (input: { id: string; patch: UpdateLabelInput }, ctx) => {
    const parsed = parse(UpdateLabelSchema, input.patch);

    const [updated] = await ctx.db
      .update(label)
      .set({
        color: parsed.color,
        name: parsed.name,
      })
      .where(eq(label.id, input.id))
      .returning();

    return updated;
  },
);

const deleteLabel = Workflow.name("task-type.delete-label").handler(
  async (input: { id: string }, ctx) => {
    await ctx.db.delete(label).where(eq(label.id, input.id));
  },
);

const listLabels = Workflow.name("task-type.list-labels").handler(
  async (input: { projectId?: string }, ctx) => {
    return ctx.step.run("query", async () => {
      const conditions = input.projectId
        ? eq(label.projectId, input.projectId)
        : undefined;
      return ctx.db.select().from(label).where(conditions);
    });
  },
);

export const taskTypes = {
  createLabel,
  createTaskType,
  deleteLabel,
  deleteTaskType,
  listLabels,
  listTaskTypes,
  updateLabel,
  updateTaskType,
};
