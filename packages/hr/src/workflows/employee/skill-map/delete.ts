import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { minLength, object, pipe, string } from "valibot";

import { employeeSkillMap } from "../../../db-schemas";

const InputSchema = object({
  id: pipe(string(), minLength(1, "id is required")),
});

export const deleteSkillMap = Workflow.name("hr.employee.delete-skill-map")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { id } = input;

    const [deleted] = await ctx.db
      .delete(employeeSkillMap)
      .where(eq(employeeSkillMap.id, id))
      .returning();

    return deleted;
  });
