import { hrUser } from "#/db-schemas";
import { UpdateHrUserSchema } from "#/types";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { minLength, object, parse, pipe, string } from "valibot";

const InputSchema = object({
  id: pipe(string(), minLength(1, "id is required")),
  patch: UpdateHrUserSchema,
});

export const updateUser = Workflow.name("hr.access.update-user")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { id, patch } = input;

    const parsed = parse(UpdateHrUserSchema, patch);

    const [result] = await ctx.db
      .update(hrUser)
      .set({ ...parsed, updatedAt: new Date() })
      .where(eq(hrUser.id, id))
      .returning();
    return result ?? null;
  });
