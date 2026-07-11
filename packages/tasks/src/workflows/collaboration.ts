import { and, desc, eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { parse } from "valibot";

import { activityLog, attachment, watcher } from "../db-schema";
import type { CreateAttachmentInput, CreateWatcherInput } from "../types";
import { CreateAttachmentSchema, CreateWatcherSchema } from "../types";

export class CollaborationWorkflow {
  constructor(private readonly db: NodePgDatabase) {}

  async addWatcher(input: CreateWatcherInput) {
    const parsed = parse(CreateWatcherSchema, input);

    const [existing] = await this.db
      .select({ id: watcher.id })
      .from(watcher)
      .where(
        and(
          eq(watcher.taskId, parsed.taskId),
          eq(watcher.userId, parsed.userId),
        ),
      )
      .limit(1);

    if (existing) return existing;

    const [result] = await this.db
      .insert(watcher)
      .values({
        taskId: parsed.taskId,
        userId: parsed.userId,
      })
      .returning();

    return result;
  }

  async removeWatcher(taskId: string, userId: string) {
    await this.db
      .delete(watcher)
      .where(and(eq(watcher.taskId, taskId), eq(watcher.userId, userId)));
  }

  async listWatchers(taskId: string) {
    return this.db.select().from(watcher).where(eq(watcher.taskId, taskId));
  }

  async addAttachment(input: CreateAttachmentInput) {
    const parsed = parse(CreateAttachmentSchema, input);

    const [result] = await this.db
      .insert(attachment)
      .values({
        commentId: parsed.commentId ?? null,
        fileId: parsed.fileId,
        taskId: parsed.taskId,
        uploadedBy: parsed.uploadedBy,
      })
      .returning();

    return result;
  }

  async deleteAttachment(id: string) {
    await this.db.delete(attachment).where(eq(attachment.id, id));
  }

  async listAttachments(taskId: string) {
    return this.db
      .select()
      .from(attachment)
      .where(eq(attachment.taskId, taskId));
  }

  async listAttachmentsByComment(commentId: string) {
    return this.db
      .select()
      .from(attachment)
      .where(eq(attachment.commentId, commentId));
  }

  async getActivityLog(taskId: string, action?: string) {
    const conditions = [eq(activityLog.taskId, taskId)];
    if (action) {
      conditions.push(eq(activityLog.action, action));
    }

    return this.db
      .select()
      .from(activityLog)
      .where(and(...conditions))
      .orderBy(desc(activityLog.createdAt));
  }
}
