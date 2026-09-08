import { employeeSkillMap } from "#/db-schemas";
import { CreateSkillMapSchema } from "#/types";
import { fetchEmployeeById } from "#/workflows/utils";

import { Workflow } from "@aspen-os/platform/server";
import { object } from "valibot";

const InputSchema = object({
  input: CreateSkillMapSchema,
});

export const createSkillMap = Workflow.name("hr.employee.create-skill-map")
  .input(InputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = input;

    // Verify employee exists
    await fetchEmployeeById(ctx.db, parsed.employeeId);

    const [result] = await ctx.db
      .insert(employeeSkillMap)
      .values({
        assessed_by: parsed.assessedBy ?? null,
        assessment_date: parsed.assessmentDate ?? null,
        certification_date: parsed.certificationDate ?? null,
        certification_name: parsed.certificationName ?? null,
        employee_id: parsed.employeeId,
        expiry_date: parsed.expiryDate ?? null,
        notes: parsed.notes ?? null,
        proficiency: parsed.proficiency,
        skill: parsed.skill,
      })
      .returning();

    return result;
  });
