import { and, desc, eq, sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { parse } from "valibot";

import { project, projectMember, task } from "../db-schema";
import type {
  CreateProjectInput,
  CreateProjectMemberInput,
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

export interface ProjectServiceDeps {
  db: NodePgDatabase;
}

export async function createProject(
  input: CreateProjectInput,
  deps: ProjectServiceDeps,
) {
  const { db } = deps;
  const parsed = parse(CreateProjectSchema, input);

  await ensureKeyUnique(parsed.key, undefined, deps);

  const [result] = await db
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

  await db.insert(projectMember).values({
    projectId: result.id,
    role: "admin",
    userId: parsed.leadId,
  });

  return result;
}

export async function updateProject(
  id: string,
  patch: UpdateProjectInput,
  deps: ProjectServiceDeps,
) {
  const { db } = deps;
  await getProjectById(id, deps);
  const parsed = parse(UpdateProjectSchema, patch);

  if (parsed.key) {
    await ensureKeyUnique(parsed.key, id, deps);
  }

  const [updated] = await db
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
    .where(eq(project.id, id))
    .returning();

  return updated;
}

export async function archiveProject(id: string, deps: ProjectServiceDeps) {
  const { db } = deps;
  await getProjectById(id, deps);
  const [updated] = await db
    .update(project)
    .set({ status: "archived", updatedAt: new Date() })
    .where(eq(project.id, id))
    .returning();
  return updated;
}

export async function restoreProject(id: string, deps: ProjectServiceDeps) {
  const { db } = deps;
  await getProjectById(id, deps);
  const [updated] = await db
    .update(project)
    .set({ status: "active", updatedAt: new Date() })
    .where(eq(project.id, id))
    .returning();
  return updated;
}

export async function deleteProject(id: string, deps: ProjectServiceDeps) {
  const { db } = deps;
  const [taskExists] = await db
    .select({ id: task.id })
    .from(task)
    .where(eq(task.projectId, id))
    .limit(1);

  if (taskExists) {
    throw new Error(
      "Cannot delete project with existing tasks. Archive instead.",
    );
  }

  await db.delete(projectMember).where(eq(projectMember.projectId, id));
  await db.delete(project).where(eq(project.id, id));
}

export async function getProjectById(id: string, deps: ProjectServiceDeps) {
  const { db } = deps;
  const [result] = await db
    .select()
    .from(project)
    .where(eq(project.id, id))
    .limit(1);

  if (!result) {
    throw new Error(`Project with id "${id}" not found.`);
  }

  return result;
}

export async function listProjects(
  filters: ProjectFilters | undefined,
  deps: ProjectServiceDeps,
) {
  const { db } = deps;
  const parsed = filters ? parse(ProjectFiltersSchema, filters) : {};
  const conditions = [];

  if (parsed.leadId) {
    conditions.push(eq(project.leadId, parsed.leadId));
  }
  if (parsed.status) {
    conditions.push(eq(project.status, parsed.status));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  return db
    .select()
    .from(project)
    .where(whereClause)
    .orderBy(desc(project.createdAt));
}

export async function addProjectMember(
  input: CreateProjectMemberInput,
  deps: ProjectServiceDeps,
) {
  const { db } = deps;
  const parsed = parse(CreateProjectMemberSchema, input);

  const [existing] = await db
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

  const [result] = await db
    .insert(projectMember)
    .values({
      projectId: parsed.projectId,
      role: parsed.role ?? "member",
      userId: parsed.userId,
    })
    .returning();

  return result;
}

export async function updateProjectMember(
  projectId: string,
  userId: string,
  patch: UpdateProjectMemberInput,
  deps: ProjectServiceDeps,
) {
  const { db } = deps;
  const parsed = parse(UpdateProjectMemberSchema, patch);

  const [updated] = await db
    .update(projectMember)
    .set({ role: parsed.role })
    .where(
      and(
        eq(projectMember.projectId, projectId),
        eq(projectMember.userId, userId),
      ),
    )
    .returning();

  if (!updated) {
    throw new Error("Project member not found.");
  }

  return updated;
}

export async function removeProjectMember(
  projectId: string,
  userId: string,
  deps: ProjectServiceDeps,
) {
  const { db } = deps;
  await db
    .delete(projectMember)
    .where(
      and(
        eq(projectMember.projectId, projectId),
        eq(projectMember.userId, userId),
      ),
    );
}

export async function listProjectMembers(
  projectId: string,
  deps: ProjectServiceDeps,
) {
  const { db } = deps;
  return db
    .select()
    .from(projectMember)
    .where(eq(projectMember.projectId, projectId));
}

async function ensureKeyUnique(
  key: string,
  excludeId: string | undefined,
  deps: ProjectServiceDeps,
): Promise<void> {
  const { db } = deps;
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
