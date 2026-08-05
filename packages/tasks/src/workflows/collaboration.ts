import { Workflow } from "@aspen-os/platform/server";
import { and, desc, eq } from "drizzle-orm";

import { activityLog, attachment, watcher } from "../db-schema";
import { CreateAttachmentSchema, CreateWatcherSchema } from "../types";

const addWatcher = Workflow.name("collaboration.add-watcher")
  .input(CreateWatcherSchema)
  .handler(async (parsed, ctx) => {
    const [existing] = await ctx.db
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

    const [result] = await ctx.db
      .insert(watcher)
      .values({
        taskId: parsed.taskId,
        userId: parsed.userId,
      })
      .returning();

    return result;
  });

const removeWatcher = Workflow.name("collaboration.remove-watcher").handler(
  async (input: { taskId: string; userId: string }, ctx) => {
    await ctx.db
      .delete(watcher)
      .where(
        and(eq(watcher.taskId, input.taskId), eq(watcher.userId, input.userId)),
      );
  },
);

const listWatchers = Workflow.name("collaboration.list-watchers").handler(
  async (input: { taskId: string }, ctx) => {
    return ctx.step.run("query", async () => {
      return ctx.db
        .select()
        .from(watcher)
        .where(eq(watcher.taskId, input.taskId));
    });
  },
);

const addAttachment = Workflow.name("collaboration.add-attachment")
  .input(CreateAttachmentSchema)
  .handler(async (parsed, ctx) => {
    const [result] = await ctx.db
      .insert(attachment)
      .values({
        commentId: parsed.commentId ?? null,
        fileId: parsed.fileId,
        taskId: parsed.taskId,
        uploadedBy: parsed.uploadedBy,
      })
      .returning();

    return result;
  });

const deleteAttachment = Workflow.name(
  "collaboration.delete-attachment",
).handler(async (input: { id: string }, ctx) => {
  await ctx.db.delete(attachment).where(eq(attachment.id, input.id));
});

const listAttachments = Workflow.name("collaboration.list-attachments").handler(
  async (input: { taskId: string }, ctx) => {
    return ctx.step.run("query", async () => {
      return ctx.db
        .select()
        .from(attachment)
        .where(eq(attachment.taskId, input.taskId));
    });
  },
);

const listAttachmentsByComment = Workflow.name(
  "collaboration.list-attachments-by-comment",
).handler(async (input: { commentId: string }, ctx) => {
  return ctx.step.run("query", async () => {
    return ctx.db
      .select()
      .from(attachment)
      .where(eq(attachment.commentId, input.commentId));
  });
});

const getActivityLog = Workflow.name("collaboration.activity-log").handler(
  async (input: { taskId: string; action?: string }, ctx) => {
    return ctx.step.run("query", async () => {
      const conditions = [eq(activityLog.taskId, input.taskId)];
      if (input.action) {
        conditions.push(eq(activityLog.action, input.action));
      }

      return ctx.db
        .select()
        .from(activityLog)
        .where(and(...conditions))
        .orderBy(desc(activityLog.createdAt));
    });
  },
);

export const collaboration = {
  addAttachment,
  addWatcher,
  deleteAttachment,
  getActivityLog,
  listAttachments,
  listAttachmentsByComment,
  listWatchers,
  removeWatcher,
};
