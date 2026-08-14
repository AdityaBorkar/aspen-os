import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { minLength, object, pipe, string } from "valibot";

import { hrPermission } from "../../../db-schemas";

const InputSchema = object({
  id: pipe(string(), minLength(1, "id is required")),
});

export const deletePermission = Workflow.name("hr.access.delete-permission")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { id } = input;

    await ctx.db.delete(hrPermission).where(eq(hrPermission.id, id));
  });
