import { hrUser } from "#/db-schemas";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { minLength, object, pipe, string } from "valibot";

const InputSchema = object({
  id: pipe(string(), minLength(1, "id is required")),
});

export const getUserById = Workflow.name("hr.access.get-user-by-id")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { id } = input;

    const [record] = await ctx.db.select().from(hrUser).where(eq(hrUser.id, id)).limit(1);
    return record ?? null;
  });
