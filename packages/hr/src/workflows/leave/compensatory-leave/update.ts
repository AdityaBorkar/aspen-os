import { compensatoryLeaveRequest } from "#/db-schemas";
import { UpdateCompensatoryLeaveSchema } from "#/types";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { minLength, object, parse, pipe, string } from "valibot";

const InputSchema = object({
  id: pipe(string(), minLength(1, "id is required")),
  patch: UpdateCompensatoryLeaveSchema,
});

export const updateCompensatoryLeave = Workflow.name("hr.leave.update-compensatory-leave")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { id, patch } = input;

    const parsed = parse(UpdateCompensatoryLeaveSchema, patch);

    const [updated] = await ctx.db
      .update(compensatoryLeaveRequest)
      .set({ ...parsed, updatedAt: new Date() })
      .where(eq(compensatoryLeaveRequest.id, id))
      .returning();

    return updated;
  });
