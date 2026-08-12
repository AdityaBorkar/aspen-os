import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { minLength, object, parse, pipe, string } from "valibot";

import { hrUserBranchAccess } from "../db-schemas";
import { UpdateBranchAccessSchema } from "../types";

const InputSchema = object({
  id: pipe(string(), minLength(1, "id is required")),
  patch: UpdateBranchAccessSchema,
});

export const updateBranchAccess = Workflow.name(
  "hr.access.update-branch-access",
)
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { id, patch } = input;

    const parsed = parse(UpdateBranchAccessSchema, patch);

    const [result] = await ctx.db
      .update(hrUserBranchAccess)
      .set({ ...parsed, updatedAt: new Date() })
      .where(eq(hrUserBranchAccess.id, id))
      .returning();
    return result ?? null;
  });
