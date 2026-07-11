import { desc, eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { parse } from "valibot";

import { comment } from "../db-schema";
import type { CreateCommentInput, UpdateCommentInput } from "../types";
import { CreateCommentSchema, UpdateCommentSchema } from "../types";

export class CommentWorkflow {
  constructor(private readonly db: NodePgDatabase) {}

  async create(input: CreateCommentInput) {
    const parsed = parse(CreateCommentSchema, input);

    const [result] = await this.db
      .insert(comment)
      .values({
        body: parsed.body,
        parentId: parsed.parentId ?? null,
        taskId: parsed.taskId,
        userId: parsed.userId,
      })
      .returning();

    return result;
  }

  async update(id: string, patch: UpdateCommentInput) {
    await this.getById(id);
    const parsed = parse(UpdateCommentSchema, patch);

    const [updated] = await this.db
      .update(comment)
      .set({
        body: parsed.body,
        editedAt: new Date(),
      })
      .where(eq(comment.id, id))
      .returning();

    return updated;
  }

  async delete(id: string) {
    await this.getById(id);
    const [updated] = await this.db
      .update(comment)
      .set({
        body: "[comment deleted]",
        isDeleted: true,
      })
      .where(eq(comment.id, id))
      .returning();

    return updated;
  }

  async getById(id: string) {
    const [result] = await this.db
      .select()
      .from(comment)
      .where(eq(comment.id, id))
      .limit(1);

    if (!result) {
      throw new Error(`Comment with id "${id}" not found.`);
    }

    return result;
  }

  async listByTask(taskId: string) {
    return this.db
      .select()
      .from(comment)
      .where(eq(comment.taskId, taskId))
      .orderBy(desc(comment.createdAt));
  }

  async listReplies(parentId: string) {
    return this.db
      .select()
      .from(comment)
      .where(eq(comment.parentId, parentId))
      .orderBy(desc(comment.createdAt));
  }
}
