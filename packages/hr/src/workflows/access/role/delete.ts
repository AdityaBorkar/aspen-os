import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { minLength, object, pipe, string } from "valibot";

import { hrRole } from "../../../db-schemas";

const InputSchema = object({
  id: pipe(string(), minLength(1, "id is required")),
});

export const deleteRole = Workflow.name("hr.access.delete-role")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { id } = input;

    const [role] = await ctx.db.select().from(hrRole).where(eq(hrRole.id, id)).limit(1);

    if (role?.isSystem) {
      throw new Error(`Cannot delete system role "${role.name}".`);
    }

    await ctx.db.delete(hrRole).where(eq(hrRole.id, id));
  });
