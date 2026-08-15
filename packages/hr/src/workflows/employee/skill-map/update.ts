import { employeeSkillMap } from "#/db-schemas";
import { UpdateSkillMapSchema } from "#/types";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { minLength, object, parse, pipe, string } from "valibot";

const InputSchema = object({
  id: pipe(string(), minLength(1, "id is required")),
  patch: UpdateSkillMapSchema,
});

export const updateSkillMap = Workflow.name("hr.employee.update-skill-map")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { id, patch } = input;

    const parsed = parse(UpdateSkillMapSchema, patch);

    const [updated] = await ctx.db
      .update(employeeSkillMap)
      .set({ ...parsed, updatedAt: new Date() })
      .where(eq(employeeSkillMap.id, id))
      .returning();

    return updated;
  });
