import { Workflow, WorkflowStep } from "@aspen-os/platform/server";
import { and, desc, eq, sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { parse } from "valibot";

import { project, projectMember, task } from "../db-schema";
import type {
  ProjectFilters,
  UpdateProjectInput,
  UpdateProjectMemberInput,
} from "../types";
import {
  CreateProjectMemberSchema,
  CreateProjectSchema,
  ProjectFiltersSchema,
  UpdateProjectMemberSchema,
  UpdateProjectSchema,
} from "../types";

type DrizzleDB = NodePgDatabase<Record<string, never>>;

async function ensureKeyUnique(
  db: DrizzleDB,
  key: string,
  excludeId: string | undefined,
): Promise<void> {
  const conditions = [eq(project.key, key)];
  if (excludeId) {
    conditions.push(sql`${project.id} != ${excludeId}`);
  }

  const [existing] = await db
    .select({ id: project.id })
    .from(project)
    .where(and(...conditions))
    .limit(1);

  if (existing) {
    throw new Error(`Project key "${key}" already exists.`);
  }
}

const fetchProjectStep = WorkflowStep.name("fetch-project").handler(
  async (input: { id: string }, ctx) => {
    const [result] = await ctx.db
      .select()
      .from(project)
      .where(eq(project.id, input.id))
      .limit(1);

    if (!result) {
      throw new Error(`Project with id "${input.id}" not found.`);
    }

    return result;
  },
);

const createProject = Workflow.name("project.create")
  .input(CreateProjectSchema)
  .handler(async (parsed, ctx) => {
    await ensureKeyUnique(ctx.db, parsed.key, undefined);

    const [result] = await ctx.db
      .insert(project)
      .values({
        defaultTaskTypeId: parsed.defaultTaskTypeId ?? null,
        description: parsed.description ?? null,
        key: parsed.key,
        leadId: parsed.leadId,
        name: parsed.name,
        startDate: parsed.startDate ?? null,
        targetDate: parsed.targetDate ?? null,
      })
      .returning();

    if (!result) {
      throw new Error("Failed to create project.");
    }

    await ctx.db.insert(projectMember).values({
      projectId: result.id,
      role: "admin",
      userId: parsed.leadId,
    });

    return result;
  });

const updateProject = Workflow.name("project.update").handler(
  async (input: { id: string; patch: UpdateProjectInput }, ctx) => {
    await ctx.step.run(fetchProjectStep, { id: input.id });
    const parsed = parse(UpdateProjectSchema, input.patch);

    if (parsed.key) {
      await ensureKeyUnique(ctx.db, parsed.key, input.id);
    }

    const [updated] = await ctx.db
      .update(project)
      .set({
        defaultTaskTypeId: parsed.defaultTaskTypeId,
        description: parsed.description,
        key: parsed.key,
        leadId: parsed.leadId,
        name: parsed.name,
        startDate: parsed.startDate,
        status: parsed.status,
        targetDate: parsed.targetDate,
        updatedAt: new Date(),
      })
      .where(eq(project.id, input.id))
      .returning();

    return updated;
  },
);

const archiveProject = Workflow.name("project.archive").handler(
  async (input: { id: string }, ctx) => {
    await ctx.step.run(fetchProjectStep, { id: input.id });
    const [updated] = await ctx.db
      .update(project)
      .set({ status: "archived", updatedAt: new Date() })
      .where(eq(project.id, input.id))
      .returning();
    return updated;
  },
);

const restoreProject = Workflow.name("project.restore").handler(
  async (input: { id: string }, ctx) => {
    await ctx.step.run(fetchProjectStep, { id: input.id });
    const [updated] = await ctx.db
      .update(project)
      .set({ status: "active", updatedAt: new Date() })
      .where(eq(project.id, input.id))
      .returning();
    return updated;
  },
);

const deleteProject = Workflow.name("project.delete").handler(
  async (input: { id: string }, ctx) => {
    const [taskExists] = await ctx.db
      .select({ id: task.id })
      .from(task)
      .where(eq(task.projectId, input.id))
      .limit(1);

    if (taskExists) {
      throw new Error(
        "Cannot delete project with existing tasks. Archive instead.",
      );
    }

    await ctx.db
      .delete(projectMember)
      .where(eq(projectMember.projectId, input.id));
    await ctx.db.delete(project).where(eq(project.id, input.id));
  },
);

const getProjectById = Workflow.name("project.get").handler(
  async (input: { id: string }, ctx) => {
    return ctx.step.run(fetchProjectStep, { id: input.id });
  },
);

const listProjects = Workflow.name("project.list").handler(
  async (input: { filters?: ProjectFilters }, ctx) => {
    return ctx.step.run("query", async () => {
      const parsed = input.filters
        ? parse(ProjectFiltersSchema, input.filters)
        : {};
      const conditions = [];

      if (parsed.leadId) {
        conditions.push(eq(project.leadId, parsed.leadId));
      }
      if (parsed.status) {
        conditions.push(eq(project.status, parsed.status));
      }

      const whereClause =
        conditions.length > 0 ? and(...conditions) : undefined;

      return ctx.db
        .select()
        .from(project)
        .where(whereClause)
        .orderBy(desc(project.createdAt));
    });
  },
);

const addProjectMember = Workflow.name("project.add-member")
  .input(CreateProjectMemberSchema)
  .handler(async (parsed, ctx) => {
    const [existing] = await ctx.db
      .select({ userId: projectMember.userId })
      .from(projectMember)
      .where(
        and(
          eq(projectMember.projectId, parsed.projectId),
          eq(projectMember.userId, parsed.userId),
        ),
      )
      .limit(1);

    if (existing) {
      throw new Error("User is already a member of this project.");
    }

    const [result] = await ctx.db
      .insert(projectMember)
      .values({
        projectId: parsed.projectId,
        role: parsed.role ?? "member",
        userId: parsed.userId,
      })
      .returning();

    return result;
  });

const updateProjectMember = Workflow.name("project.update-member").handler(
  async (
    input: {
      projectId: string;
      userId: string;
      patch: UpdateProjectMemberInput;
    },
    ctx,
  ) => {
    const parsed = parse(UpdateProjectMemberSchema, input.patch);

    const [updated] = await ctx.db
      .update(projectMember)
      .set({ role: parsed.role })
      .where(
        and(
          eq(projectMember.projectId, input.projectId),
          eq(projectMember.userId, input.userId),
        ),
      )
      .returning();

    if (!updated) {
      throw new Error("Project member not found.");
    }

    return updated;
  },
);

const removeProjectMember = Workflow.name("project.remove-member").handler(
  async (input: { projectId: string; userId: string }, ctx) => {
    await ctx.db
      .delete(projectMember)
      .where(
        and(
          eq(projectMember.projectId, input.projectId),
          eq(projectMember.userId, input.userId),
        ),
      );
  },
);

const listProjectMembers = Workflow.name("project.list-members").handler(
  async (input: { projectId: string }, ctx) => {
    return ctx.step.run("query", async () => {
      return ctx.db
        .select()
        .from(projectMember)
        .where(eq(projectMember.projectId, input.projectId));
    });
  },
);

export const projects = {
  addMember: addProjectMember,
  archive: archiveProject,
  create: createProject,
  delete: deleteProject,
  get: getProjectById,
  list: listProjects,
  listMembers: listProjectMembers,
  removeMember: removeProjectMember,
  restore: restoreProject,
  update: updateProject,
  updateMember: updateProjectMember,
};
