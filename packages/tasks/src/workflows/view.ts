import { Workflow, WorkflowStep } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { parse } from "valibot";

import { savedView } from "../db-schema";
import type { UpdateSavedViewInput } from "../types";
import { CreateSavedViewSchema, UpdateSavedViewSchema } from "../types";

type ViewType = "list" | "board" | "calendar" | "timeline";

type DrizzleDB = NodePgDatabase<Record<string, never>>;

async function unsetDefault(
  db: DrizzleDB,
  ownerId: string,
  projectId: string | null,
): Promise<void> {
  const conditions = [
    eq(savedView.ownerId, ownerId),
    eq(savedView.isDefault, true),
  ];

  if (projectId) {
    conditions.push(eq(savedView.projectId, projectId));
  }

  await db
    .update(savedView)
    .set({ isDefault: false })
    .where(and(...conditions));
}

const fetchSavedViewStep = WorkflowStep.name("fetch-saved-view").handler(
  async (input: { id: string }, ctx) => {
    const [result] = await ctx.db
      .select()
      .from(savedView)
      .where(eq(savedView.id, input.id))
      .limit(1);

    if (!result) {
      throw new Error(`Saved view with id "${input.id}" not found.`);
    }

    return result;
  },
);

const createSavedView = Workflow.name("view.create")
  .input(CreateSavedViewSchema)
  .handler(async (parsed, ctx) => {
    if (parsed.isDefault) {
      await unsetDefault(ctx.db, parsed.ownerId, parsed.projectId ?? null);
    }

    const [result] = await ctx.db
      .insert(savedView)
      .values({
        filters: parsed.filters ?? null,
        groupBy: parsed.groupBy ?? null,
        isDefault: parsed.isDefault ?? false,
        isShared: parsed.isShared ?? false,
        name: parsed.name,
        ownerId: parsed.ownerId,
        projectId: parsed.projectId ?? null,
        sort: parsed.sort ?? null,
        type: (parsed.type ?? "list") as ViewType,
      })
      .returning();

    return result;
  });

const updateSavedView = Workflow.name("view.update").handler(
  async (input: { id: string; patch: UpdateSavedViewInput }, ctx) => {
    await ctx.step.run(fetchSavedViewStep, { id: input.id });
    const parsed = parse(UpdateSavedViewSchema, input.patch);

    const [updated] = await ctx.db
      .update(savedView)
      .set({
        filters: parsed.filters,
        groupBy: parsed.groupBy,
        isDefault: parsed.isDefault,
        isShared: parsed.isShared,
        name: parsed.name,
        sort: parsed.sort,
        type: parsed.type as ViewType | undefined,
      })
      .where(eq(savedView.id, input.id))
      .returning();

    return updated;
  },
);

const deleteSavedView = Workflow.name("view.delete").handler(
  async (input: { id: string }, ctx) => {
    await ctx.db.delete(savedView).where(eq(savedView.id, input.id));
  },
);

const getSavedViewById = Workflow.name("view.get").handler(
  async (input: { id: string }, ctx) => {
    return ctx.step.run(fetchSavedViewStep, { id: input.id });
  },
);

const listSavedViewsByOwner = Workflow.name("view.list-by-owner").handler(
  async (input: { ownerId: string }, ctx) => {
    return ctx.step.run("query", async () => {
      return ctx.db
        .select()
        .from(savedView)
        .where(eq(savedView.ownerId, input.ownerId));
    });
  },
);

const listSavedViewsByProject = Workflow.name("view.list-by-project").handler(
  async (input: { projectId: string }, ctx) => {
    return ctx.step.run("query", async () => {
      return ctx.db
        .select()
        .from(savedView)
        .where(eq(savedView.projectId, input.projectId));
    });
  },
);

const listSharedSavedViews = Workflow.name("view.list-shared").handler(
  async (input: { projectId: string }, ctx) => {
    return ctx.step.run("query", async () => {
      return ctx.db
        .select()
        .from(savedView)
        .where(
          and(
            eq(savedView.projectId, input.projectId),
            eq(savedView.isShared, true),
          ),
        );
    });
  },
);

const getDefaultSavedView = Workflow.name("view.get-default").handler(
  async (input: { ownerId: string; projectId?: string }, ctx) => {
    return ctx.step.run("query", async () => {
      const conditions = [
        eq(savedView.ownerId, input.ownerId),
        eq(savedView.isDefault, true),
      ];

      if (input.projectId) {
        conditions.push(eq(savedView.projectId, input.projectId));
      }

      const [result] = await ctx.db
        .select()
        .from(savedView)
        .where(and(...conditions))
        .limit(1);

      return result ?? null;
    });
  },
);

export const views = {
  create: createSavedView,
  delete: deleteSavedView,
  get: getSavedViewById,
  getDefault: getDefaultSavedView,
  listByOwner: listSavedViewsByOwner,
  listByProject: listSavedViewsByProject,
  listShared: listSharedSavedViews,
  update: updateSavedView,
};
