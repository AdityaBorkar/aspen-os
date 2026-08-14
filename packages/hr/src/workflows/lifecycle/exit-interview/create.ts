import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

import { exitInterview } from "../../../db-schemas";
import { CreateExitInterviewSchema } from "../../../types";

const InputSchema = object({
  input: CreateExitInterviewSchema,
});

export const createExitInterview = Workflow.name("hr.lifecycle.create-exit-interview")
  .input(InputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CreateExitInterviewSchema, input);

    const [result] = await ctx.db
      .insert(exitInterview)
      .values({
        employeeId: parsed.employeeId,
        interviewer: parsed.interviewer ?? null,
        questionnaireTemplate: parsed.questionnaireTemplate ?? null,
        scheduledDate: parsed.scheduledDate ? new Date(parsed.scheduledDate) : null,
        separationId: parsed.separationId ?? null,
      })
      .returning();

    return result;
  });
