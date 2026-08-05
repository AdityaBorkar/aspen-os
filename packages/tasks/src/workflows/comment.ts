import { Workflow, WorkflowStep } from "@aspen-os/platform/server";
import { desc, eq } from "drizzle-orm";
import { parse } from "valibot";

import { comment } from "../db-schema";
import type { UpdateCommentInput } from "../types";
import { CreateCommentSchema, UpdateCommentSchema } from "../types";

const fetchCommentStep = WorkflowStep.name("fetch-comment").handler(
  async (input: { id: string }, ctx) => {
    const [result] = await ctx.db
      .select()
      .from(comment)
      .where(eq(comment.id, input.id))
      .limit(1);

    if (!result) {
      throw new Error(`Comment with id "${input.id}" not found.`);
    }

    return result;
  },
);

const createComment = Workflow.name("comment.create")
  .input(CreateCommentSchema)
  .handler(async (parsed, ctx) => {
    const [result] = await ctx.db
      .insert(comment)
      .values({
        body: parsed.body,
        parentId: parsed.parentId ?? null,
        taskId: parsed.taskId,
        userId: parsed.userId,
      })
      .returning();

    return result;
  });

const updateComment = Workflow.name("comment.update").handler(
  async (input: { id: string; patch: UpdateCommentInput }, ctx) => {
    await ctx.step.run(fetchCommentStep, { id: input.id });
    const parsed = parse(UpdateCommentSchema, input.patch);

    const [updated] = await ctx.db
      .update(comment)
      .set({
        body: parsed.body,
        editedAt: new Date(),
      })
      .where(eq(comment.id, input.id))
      .returning();

    return updated;
  },
);

const deleteComment = Workflow.name("comment.delete").handler(
  async (input: { id: string }, ctx) => {
    await ctx.step.run(fetchCommentStep, { id: input.id });
    const [updated] = await ctx.db
      .update(comment)
      .set({
        body: "[comment deleted]",
        isDeleted: true,
      })
      .where(eq(comment.id, input.id))
      .returning();

    return updated;
  },
);

const getCommentById = Workflow.name("comment.get").handler(
  async (input: { id: string }, ctx) => {
    return ctx.step.run(fetchCommentStep, { id: input.id });
  },
);

const listCommentsByTask = Workflow.name("comment.list-by-task").handler(
  async (input: { taskId: string }, ctx) => {
    return ctx.step.run("query", async () => {
      return ctx.db
        .select()
        .from(comment)
        .where(eq(comment.taskId, input.taskId))
        .orderBy(desc(comment.createdAt));
    });
  },
);

const listCommentReplies = Workflow.name("comment.list-replies").handler(
  async (input: { parentId: string }, ctx) => {
    return ctx.step.run("query", async () => {
      return ctx.db
        .select()
        .from(comment)
        .where(eq(comment.parentId, input.parentId))
        .orderBy(desc(comment.createdAt));
    });
  },
);

export const comments = {
  create: createComment,
  delete: deleteComment,
  get: getCommentById,
  listByTask: listCommentsByTask,
  listReplies: listCommentReplies,
  update: updateComment,
};
