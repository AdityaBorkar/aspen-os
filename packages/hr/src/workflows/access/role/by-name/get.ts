import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { minLength, object, pipe, string } from "valibot";

import { hrRole } from "../../../../db-schemas";

const InputSchema = object({
  name: pipe(string(), minLength(1, "name is required")),
});

export const getRoleByName = Workflow.name("hr.access.get-role-by-name")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { name } = input;

    const [record] = await ctx.db.select().from(hrRole).where(eq(hrRole.name, name)).limit(1);
    return record ?? null;
  });
