import { desc, eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { parse } from "valibot";

import { comment } from "../db-schema";
import type { CreateCommentInput, UpdateCommentInput } from "../types";
import { CreateCommentSchema, UpdateCommentSchema } from "../types";

export interface CommentServiceDeps {
  db: NodePgDatabase;
}

export async function createComment(
  input: CreateCommentInput,
  deps: CommentServiceDeps,
) {
  const { db } = deps;
  const parsed = parse(CreateCommentSchema, input);

  const [result] = await db
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

export async function updateComment(
  id: string,
  patch: UpdateCommentInput,
  deps: CommentServiceDeps,
) {
  const { db } = deps;
  await getCommentById(id, deps);
  const parsed = parse(UpdateCommentSchema, patch);

  const [updated] = await db
    .update(comment)
    .set({
      body: parsed.body,
      editedAt: new Date(),
    })
    .where(eq(comment.id, id))
    .returning();

  return updated;
}

export async function deleteComment(id: string, deps: CommentServiceDeps) {
  const { db } = deps;
  await getCommentById(id, deps);
  const [updated] = await db
    .update(comment)
    .set({
      body: "[comment deleted]",
      isDeleted: true,
    })
    .where(eq(comment.id, id))
    .returning();

  return updated;
}

export async function getCommentById(id: string, deps: CommentServiceDeps) {
  const { db } = deps;
  const [result] = await db
    .select()
    .from(comment)
    .where(eq(comment.id, id))
    .limit(1);

  if (!result) {
    throw new Error(`Comment with id "${id}" not found.`);
  }

  return result;
}

export async function listCommentsByTask(
  taskId: string,
  deps: CommentServiceDeps,
) {
  const { db } = deps;
  return db
    .select()
    .from(comment)
    .where(eq(comment.taskId, taskId))
    .orderBy(desc(comment.createdAt));
}

export async function listCommentReplies(
  parentId: string,
  deps: CommentServiceDeps,
) {
  const { db } = deps;
  return db
    .select()
    .from(comment)
    .where(eq(comment.parentId, parentId))
    .orderBy(desc(comment.createdAt));
}
