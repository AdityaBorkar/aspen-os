import { and, desc, eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { parse } from "valibot";

import { activityLog, attachment, watcher } from "../db-schema";
import type { CreateAttachmentInput, CreateWatcherInput } from "../types";
import { CreateAttachmentSchema, CreateWatcherSchema } from "../types";

export interface CollaborationServiceDeps {
  db: NodePgDatabase;
}

export async function addWatcher(
  input: CreateWatcherInput,
  deps: CollaborationServiceDeps,
) {
  const { db } = deps;
  const parsed = parse(CreateWatcherSchema, input);

  const [existing] = await db
    .select({ id: watcher.id })
    .from(watcher)
    .where(
      and(eq(watcher.taskId, parsed.taskId), eq(watcher.userId, parsed.userId)),
    )
    .limit(1);

  if (existing) return existing;

  const [result] = await db
    .insert(watcher)
    .values({
      taskId: parsed.taskId,
      userId: parsed.userId,
    })
    .returning();

  return result;
}

export async function removeWatcher(
  taskId: string,
  userId: string,
  deps: CollaborationServiceDeps,
) {
  const { db } = deps;
  await db
    .delete(watcher)
    .where(and(eq(watcher.taskId, taskId), eq(watcher.userId, userId)));
}

export async function listWatchers(
  taskId: string,
  deps: CollaborationServiceDeps,
) {
  const { db } = deps;
  return db.select().from(watcher).where(eq(watcher.taskId, taskId));
}

export async function addAttachment(
  input: CreateAttachmentInput,
  deps: CollaborationServiceDeps,
) {
  const { db } = deps;
  const parsed = parse(CreateAttachmentSchema, input);

  const [result] = await db
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

export async function deleteAttachment(
  id: string,
  deps: CollaborationServiceDeps,
) {
  const { db } = deps;
  await db.delete(attachment).where(eq(attachment.id, id));
}

export async function listAttachments(
  taskId: string,
  deps: CollaborationServiceDeps,
) {
  const { db } = deps;
  return db.select().from(attachment).where(eq(attachment.taskId, taskId));
}

export async function listAttachmentsByComment(
  commentId: string,
  deps: CollaborationServiceDeps,
) {
  const { db } = deps;
  return db
    .select()
    .from(attachment)
    .where(eq(attachment.commentId, commentId));
}

export async function getActivityLog(
  taskId: string,
  action: string | undefined,
  deps: CollaborationServiceDeps,
) {
  const { db } = deps;
  const conditions = [eq(activityLog.taskId, taskId)];
  if (action) {
    conditions.push(eq(activityLog.action, action));
  }

  return db
    .select()
    .from(activityLog)
    .where(and(...conditions))
    .orderBy(desc(activityLog.createdAt));
}
