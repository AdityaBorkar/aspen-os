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

export class TaskTypeWorkflow {
  constructor(private readonly db: NodePgDatabase) {}

  async createTaskType(input: CreateTaskTypeInput) {
    const parsed = parse(CreateTaskTypeSchema, input);

    if (parsed.isDefault) {
      await this.unsetDefaultTaskType(parsed.projectId ?? null);
    }

    const [result] = await this.db
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

  async updateTaskType(id: string, patch: UpdateTaskTypeInput) {
    const parsed = parse(UpdateTaskTypeSchema, patch);

    if (parsed.isDefault) {
      const [current] = await this.db
        .select({ projectId: taskType.projectId })
        .from(taskType)
        .where(eq(taskType.id, id))
        .limit(1);
      if (current) {
        await this.unsetDefaultTaskType(current.projectId);
      }
    }

    const [updated] = await this.db
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

  async deleteTaskType(id: string) {
    await this.db.delete(taskType).where(eq(taskType.id, id));
  }

  async listTaskTypes(projectId?: string) {
    const conditions = projectId
      ? eq(taskType.projectId, projectId)
      : undefined;
    return this.db.select().from(taskType).where(conditions);
  }

  async createLabel(input: CreateLabelInput) {
    const parsed = parse(CreateLabelSchema, input);

    const [result] = await this.db
      .insert(label)
      .values({
        color: parsed.color ?? null,
        name: parsed.name,
        projectId: parsed.projectId ?? null,
      })
      .returning();

    return result;
  }

  async updateLabel(id: string, patch: UpdateLabelInput) {
    const parsed = parse(UpdateLabelSchema, patch);

    const [updated] = await this.db
      .update(label)
      .set({
        color: parsed.color,
        name: parsed.name,
      })
      .where(eq(label.id, id))
      .returning();

    return updated;
  }

  async deleteLabel(id: string) {
    await this.db.delete(label).where(eq(label.id, id));
  }

  async listLabels(projectId?: string) {
    const conditions = projectId ? eq(label.projectId, projectId) : undefined;
    return this.db.select().from(label).where(conditions);
  }

  private async unsetDefaultTaskType(projectId: string | null): Promise<void> {
    if (projectId) {
      await this.db
        .update(taskType)
        .set({ isDefault: false })
        .where(eq(taskType.projectId, projectId));
    } else {
      await this.db
        .update(taskType)
        .set({ isDefault: false })
        .where(eq(taskType.projectId, null as unknown as string));
    }
  }
}
