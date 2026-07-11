import { and, asc, eq } from "drizzle-orm";
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

export class StatusWorkflow {
  constructor(private readonly db: NodePgDatabase) {}

  async createStatus(input: CreateStatusInput) {
    const parsed = parse(CreateStatusSchema, input);

    if (parsed.isDefault) {
      await this.unsetDefault(parsed.projectId ?? null);
    }

    const [result] = await this.db
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

  async updateStatus(id: string, patch: UpdateStatusInput) {
    await this.getStatusById(id);
    const parsed = parse(UpdateStatusSchema, patch);

    if (parsed.isDefault) {
      const [current] = await this.db
        .select({ projectId: status.projectId })
        .from(status)
        .where(eq(status.id, id))
        .limit(1);
      if (current) {
        await this.unsetDefault(current.projectId);
      }
    }

    const [updated] = await this.db
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

  async deleteStatus(id: string) {
    await this.db.delete(status).where(eq(status.id, id));
  }

  async getStatusById(id: string) {
    const [result] = await this.db
      .select()
      .from(status)
      .where(eq(status.id, id))
      .limit(1);

    if (!result) {
      throw new Error(`Status with id "${id}" not found.`);
    }

    return result;
  }

  async listStatuses(projectId?: string) {
    const conditions = projectId ? eq(status.projectId, projectId) : undefined;

    return this.db
      .select()
      .from(status)
      .where(conditions)
      .orderBy(asc(status.sortOrder));
  }

  async getGlobalStatuses() {
    return this.db
      .select()
      .from(status)
      .where(eq(status.projectId, null as unknown as string))
      .orderBy(asc(status.sortOrder));
  }

  async createTransition(input: CreateStatusTransitionInput) {
    const parsed = parse(CreateStatusTransitionSchema, input);

    if (parsed.fromStatusId === parsed.toStatusId) {
      throw new Error("From and to status cannot be the same.");
    }

    const [result] = await this.db
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

  async deleteTransition(id: string) {
    await this.db.delete(statusTransition).where(eq(statusTransition.id, id));
  }

  async listTransitions(projectId: string) {
    return this.db
      .select()
      .from(statusTransition)
      .where(eq(statusTransition.projectId, projectId));
  }

  async validateTransition(
    fromStatusId: string,
    toStatusId: string,
    projectId: string,
  ): Promise<boolean> {
    const [transition] = await this.db
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

    const anyTransition = await this.db
      .select({ id: statusTransition.id })
      .from(statusTransition)
      .where(eq(statusTransition.projectId, projectId))
      .limit(1);

    return anyTransition.length === 0;
  }

  private async unsetDefault(projectId: string | null): Promise<void> {
    if (projectId) {
      await this.db
        .update(status)
        .set({ isDefault: false })
        .where(eq(status.projectId, projectId));
    } else {
      await this.db
        .update(status)
        .set({ isDefault: false })
        .where(eq(status.projectId, null as unknown as string));
    }
  }
}
