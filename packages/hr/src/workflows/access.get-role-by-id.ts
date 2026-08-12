import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { minLength, object, pipe, string } from "valibot";

import { hrRole } from "../db-schemas";

const InputSchema = object({
  id: pipe(string(), minLength(1, "id is required")),
});

export const getRoleById = Workflow.name("hr.access.get-role-by-id")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { id } = input;

    const [record] = await ctx.db
      .select()
      .from(hrRole)
      .where(eq(hrRole.id, id))
      .limit(1);
    return record ?? null;
  });
