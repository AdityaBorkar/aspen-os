import { Workflow, WorkflowStep } from "@aspen-os/platform/server";
import { and, asc, eq, isNull } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { parse } from "valibot";

import { status, statusTransition } from "../db-schema";
import type { UpdateStatusInput } from "../types";
import {
  CreateStatusSchema,
  CreateStatusTransitionSchema,
  UpdateStatusSchema,
} from "../types";

type DrizzleDB = NodePgDatabase<Record<string, never>>;

async function unsetDefault(
  db: DrizzleDB,
  projectId: string | null,
): Promise<void> {
  await db
    .update(status)
    .set({ isDefault: false })
    .where(
      projectId === null
        ? isNull(status.projectId)
        : eq(status.projectId, projectId),
    );
}

const fetchStatusStep = WorkflowStep.name("fetch-status").handler(
  async (input: { id: string }, ctx) => {
    const [result] = await ctx.db
      .select()
      .from(status)
      .where(eq(status.id, input.id))
      .limit(1);

    if (!result) {
      throw new Error(`Status with id "${input.id}" not found.`);
    }

    return result;
  },
);

const createStatus = Workflow.name("status.create")
  .input(CreateStatusSchema)
  .handler(async (parsed, ctx) => {
    if (parsed.isDefault) {
      await unsetDefault(ctx.db, parsed.projectId ?? null);
    }

    const [result] = await ctx.db
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
  });

const updateStatus = Workflow.name("status.update").handler(
  async (input: { id: string; patch: UpdateStatusInput }, ctx) => {
    await ctx.step.run(fetchStatusStep, { id: input.id });
    const parsed = parse(UpdateStatusSchema, input.patch);

    if (parsed.isDefault) {
      const [current] = await ctx.db
        .select({ projectId: status.projectId })
        .from(status)
        .where(eq(status.id, input.id))
        .limit(1);
      if (current) {
        await unsetDefault(ctx.db, current.projectId);
      }
    }

    const [updated] = await ctx.db
      .update(status)
      .set({
        category: parsed.category,
        color: parsed.color,
        isDefault: parsed.isDefault,
        isResolved: parsed.isResolved,
        name: parsed.name,
        sortOrder: parsed.sortOrder,
      })
      .where(eq(status.id, input.id))
      .returning();

    return updated;
  },
);

const deleteStatus = Workflow.name("status.delete").handler(
  async (input: { id: string }, ctx) => {
    await ctx.db.delete(status).where(eq(status.id, input.id));
  },
);

const getStatusById = Workflow.name("status.get").handler(
  async (input: { id: string }, ctx) => {
    return ctx.step.run(fetchStatusStep, { id: input.id });
  },
);

const listStatuses = Workflow.name("status.list").handler(
  async (input: { projectId?: string }, ctx) => {
    return ctx.step.run("query", async () => {
      const conditions = input.projectId
        ? eq(status.projectId, input.projectId)
        : undefined;
      return ctx.db
        .select()
        .from(status)
        .where(conditions)
        .orderBy(asc(status.sortOrder));
    });
  },
);

const getGlobalStatuses = Workflow.name("status.global").handler(
  async (_input: undefined, ctx) => {
    return ctx.step.run("query", async () => {
      return ctx.db
        .select()
        .from(status)
        .where(isNull(status.projectId))
        .orderBy(asc(status.sortOrder));
    });
  },
);

const createTransition = Workflow.name("status.create-transition")
  .input(CreateStatusTransitionSchema)
  .handler(async (parsed, ctx) => {
    if (parsed.fromStatusId === parsed.toStatusId) {
      throw new Error("From and to status cannot be the same.");
    }

    const [result] = await ctx.db
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
  });

const deleteTransition = Workflow.name("status.delete-transition").handler(
  async (input: { id: string }, ctx) => {
    await ctx.db
      .delete(statusTransition)
      .where(eq(statusTransition.id, input.id));
  },
);

const listTransitions = Workflow.name("status.list-transitions").handler(
  async (input: { projectId: string }, ctx) => {
    return ctx.step.run("query", async () => {
      return ctx.db
        .select()
        .from(statusTransition)
        .where(eq(statusTransition.projectId, input.projectId));
    });
  },
);

const validateTransition = Workflow.name("status.validate-transition").handler(
  async (
    input: { fromStatusId: string; toStatusId: string; projectId: string },
    ctx,
  ) => {
    return ctx.step.run("query", async () => {
      const [transition] = await ctx.db
        .select({ id: statusTransition.id })
        .from(statusTransition)
        .where(
          and(
            eq(statusTransition.fromStatusId, input.fromStatusId),
            eq(statusTransition.toStatusId, input.toStatusId),
            eq(statusTransition.projectId, input.projectId),
          ),
        )
        .limit(1);

      if (transition) return true;

      const anyTransition = await ctx.db
        .select({ id: statusTransition.id })
        .from(statusTransition)
        .where(eq(statusTransition.projectId, input.projectId))
        .limit(1);

      return anyTransition.length === 0;
    });
  },
);

export const statuses = {
  create: createStatus,
  createTransition,
  delete: deleteStatus,
  deleteTransition,
  get: getStatusById,
  getGlobal: getGlobalStatuses,
  list: listStatuses,
  listTransitions,
  update: updateStatus,
  validateTransition,
};
