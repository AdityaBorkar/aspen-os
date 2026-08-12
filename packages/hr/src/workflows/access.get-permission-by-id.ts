import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { minLength, object, pipe, string } from "valibot";

import { hrPermission } from "../db-schemas";

const InputSchema = object({
  id: pipe(string(), minLength(1, "id is required")),
});

export const getPermissionById = Workflow.name("hr.access.get-permission-by-id")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { id } = input;

    const [record] = await ctx.db
      .select()
      .from(hrPermission)
      .where(eq(hrPermission.id, id))
      .limit(1);
    return record ?? null;
  });
