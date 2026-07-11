import { and, eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { parse } from "valibot";

import { savedView } from "../db-schema";
import type { CreateSavedViewInput, UpdateSavedViewInput } from "../types";
import { CreateSavedViewSchema, UpdateSavedViewSchema } from "../types";

export class ViewWorkflow {
  constructor(private readonly db: NodePgDatabase) {}

  async create(input: CreateSavedViewInput) {
    const parsed = parse(CreateSavedViewSchema, input);

    if (parsed.isDefault) {
      await this.unsetDefault(parsed.ownerId, parsed.projectId ?? null);
    }

    const [result] = await this.db
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
        type:
          (parsed.type as "list" | "board" | "calendar" | "timeline") ?? "list",
      })
      .returning();

    return result;
  }

  async update(id: string, patch: UpdateSavedViewInput) {
    await this.getById(id);
    const parsed = parse(UpdateSavedViewSchema, patch);

    const [updated] = await this.db
      .update(savedView)
      .set({
        filters: parsed.filters,
        groupBy: parsed.groupBy,
        isDefault: parsed.isDefault,
        isShared: parsed.isShared,
        name: parsed.name,
        sort: parsed.sort,
        type: parsed.type as
          | "list"
          | "board"
          | "calendar"
          | "timeline"
          | undefined,
      })
      .where(eq(savedView.id, id))
      .returning();

    return updated;
  }

  async delete(id: string) {
    await this.db.delete(savedView).where(eq(savedView.id, id));
  }

  async getById(id: string) {
    const [result] = await this.db
      .select()
      .from(savedView)
      .where(eq(savedView.id, id))
      .limit(1);

    if (!result) {
      throw new Error(`Saved view with id "${id}" not found.`);
    }

    return result;
  }

  async listByOwner(ownerId: string) {
    return this.db
      .select()
      .from(savedView)
      .where(eq(savedView.ownerId, ownerId));
  }

  async listByProject(projectId: string) {
    return this.db
      .select()
      .from(savedView)
      .where(eq(savedView.projectId, projectId));
  }

  async listShared(projectId: string) {
    return this.db
      .select()
      .from(savedView)
      .where(
        and(eq(savedView.projectId, projectId), eq(savedView.isShared, true)),
      );
  }

  async getDefault(ownerId: string, projectId?: string) {
    const conditions = [
      eq(savedView.ownerId, ownerId),
      eq(savedView.isDefault, true),
    ];

    if (projectId) {
      conditions.push(eq(savedView.projectId, projectId));
    }

    const [result] = await this.db
      .select()
      .from(savedView)
      .where(and(...conditions))
      .limit(1);

    return result ?? null;
  }

  private async unsetDefault(
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

    await this.db
      .update(savedView)
      .set({ isDefault: false })
      .where(and(...conditions));
  }
}
