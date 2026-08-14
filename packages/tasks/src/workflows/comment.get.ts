import { Workflow } from "@aspen-os/platform/server";
import { object } from "valibot";

import { IdSchema } from "../types";
import { fetchCommentStep } from "../workflow-steps/fetch-comment";

export const getComment = Workflow.name("comment.get")
  .input(object({ id: IdSchema }))
  .handler(async ({ id }, ctx) => ctx.step.run(fetchCommentStep, { id }));
