import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { minLength, object, parse, pipe, string } from "valibot";

import { hrRole } from "../../../db-schemas";
import { UpdateHrRoleSchema } from "../../../types";

const InputSchema = object({
  id: pipe(string(), minLength(1, "id is required")),
  patch: UpdateHrRoleSchema,
});

export const updateRole = Workflow.name("hr.access.update-role")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { id, patch } = input;

    const parsed = parse(UpdateHrRoleSchema, patch);

    const [result] = await ctx.db
      .update(hrRole)
      .set({ ...parsed, updatedAt: new Date() })
      .where(eq(hrRole.id, id))
      .returning();
    return result ?? null;
  });
