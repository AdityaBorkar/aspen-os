import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { minLength, object, pipe, string } from "valibot";

import { employeeSkillMap } from "../db-schemas";

const InputSchema = object({
  id: pipe(string(), minLength(1, "id is required")),
});

export const getSkillMapById = Workflow.name("hr.employee.get-skill-map-by-id")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { id } = input;

    const [result] = await ctx.db
      .select()
      .from(employeeSkillMap)
      .where(eq(employeeSkillMap.id, id))
      .limit(1);

    if (!result) {
      throw new Error(`Skill map with id "${id}" not found.`);
    }

    return result;
  });
