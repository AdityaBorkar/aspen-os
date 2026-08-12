import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { minLength, object, parse, pipe, string } from "valibot";

import { leaveApplication } from "../db-schemas";
import { UpdateLeaveApplicationSchema } from "../types";

const InputSchema = object({
  id: pipe(string(), minLength(1, "id is required")),
  patch: UpdateLeaveApplicationSchema,
});

export const updateLeaveApplication = Workflow.name(
  "hr.leave.update-leave-application",
)
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { id, patch } = input;

    const parsed = parse(UpdateLeaveApplicationSchema, patch);

    const [updated] = await ctx.db
      .update(leaveApplication)
      .set({ ...parsed, updatedAt: new Date() })
      .where(eq(leaveApplication.id, id))
      .returning();

    return updated;
  });
