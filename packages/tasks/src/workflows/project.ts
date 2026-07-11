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

export class ProjectWorkflow {
  constructor(private readonly db: NodePgDatabase) {}

  async create(input: CreateProjectInput) {
    const parsed = parse(CreateProjectSchema, input);

    await this.ensureKeyUnique(parsed.key);

    const [result] = await this.db
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

    await this.db.insert(projectMember).values({
      projectId: result.id,
      role: "admin",
      userId: parsed.leadId,
    });

    return result;
  }

  async update(id: string, patch: UpdateProjectInput) {
    await this.getById(id);
    const parsed = parse(UpdateProjectSchema, patch);

    if (parsed.key) {
      await this.ensureKeyUnique(parsed.key, id);
    }

    const [updated] = await this.db
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

  async archive(id: string) {
    await this.getById(id);
    const [updated] = await this.db
      .update(project)
      .set({ status: "archived", updatedAt: new Date() })
      .where(eq(project.id, id))
      .returning();
    return updated;
  }

  async restore(id: string) {
    await this.getById(id);
    const [updated] = await this.db
      .update(project)
      .set({ status: "active", updatedAt: new Date() })
      .where(eq(project.id, id))
      .returning();
    return updated;
  }

  async delete(id: string) {
    const [taskExists] = await this.db
      .select({ id: task.id })
      .from(task)
      .where(eq(task.projectId, id))
      .limit(1);

    if (taskExists) {
      throw new Error(
        "Cannot delete project with existing tasks. Archive instead.",
      );
    }

    await this.db.delete(projectMember).where(eq(projectMember.projectId, id));
    await this.db.delete(project).where(eq(project.id, id));
  }

  async getById(id: string) {
    const [result] = await this.db
      .select()
      .from(project)
      .where(eq(project.id, id))
      .limit(1);

    if (!result) {
      throw new Error(`Project with id "${id}" not found.`);
    }

    return result;
  }

  async list(filters?: ProjectFilters) {
    const parsed = filters ? parse(ProjectFiltersSchema, filters) : {};
    const conditions = [];

    if (parsed.leadId) {
      conditions.push(eq(project.leadId, parsed.leadId));
    }
    if (parsed.status) {
      conditions.push(eq(project.status, parsed.status));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    return this.db
      .select()
      .from(project)
      .where(whereClause)
      .orderBy(desc(project.createdAt));
  }

  async addMember(input: CreateProjectMemberInput) {
    const parsed = parse(CreateProjectMemberSchema, input);

    const [existing] = await this.db
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

    const [result] = await this.db
      .insert(projectMember)
      .values({
        projectId: parsed.projectId,
        role: parsed.role ?? "member",
        userId: parsed.userId,
      })
      .returning();

    return result;
  }

  async updateMember(
    projectId: string,
    userId: string,
    patch: UpdateProjectMemberInput,
  ) {
    const parsed = parse(UpdateProjectMemberSchema, patch);

    const [updated] = await this.db
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

  async removeMember(projectId: string, userId: string) {
    await this.db
      .delete(projectMember)
      .where(
        and(
          eq(projectMember.projectId, projectId),
          eq(projectMember.userId, userId),
        ),
      );
  }

  async listMembers(projectId: string) {
    return this.db
      .select()
      .from(projectMember)
      .where(eq(projectMember.projectId, projectId));
  }

  private async ensureKeyUnique(
    key: string,
    excludeId?: string,
  ): Promise<void> {
    const conditions = [eq(project.key, key)];
    if (excludeId) {
      conditions.push(sql`${project.id} != ${excludeId}`);
    }

    const [existing] = await this.db
      .select({ id: project.id })
      .from(project)
      .where(and(...conditions))
      .limit(1);

    if (existing) {
      throw new Error(`Project key "${key}" already exists.`);
    }
  }
}
