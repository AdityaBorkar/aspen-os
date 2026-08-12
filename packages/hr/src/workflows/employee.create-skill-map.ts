import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

import { employeeSkillMap } from "../db-schemas";
import { CreateSkillMapSchema } from "../types";
import { fetchEmployeeById } from "./utils";

const InputSchema = object({
  input: CreateSkillMapSchema,
});

export const createSkillMap = Workflow.name("hr.employee.create-skill-map")
  .input(InputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CreateSkillMapSchema, input);

    // Verify employee exists
    await fetchEmployeeById(ctx.db, parsed.employeeId);

    const [result] = await ctx.db
      .insert(employeeSkillMap)
      .values({
        assessedBy: parsed.assessedBy ?? null,
        assessmentDate: parsed.assessmentDate ?? null,
        certificationDate: parsed.certificationDate ?? null,
        certificationName: parsed.certificationName ?? null,
        employeeId: parsed.employeeId,
        expiryDate: parsed.expiryDate ?? null,
        notes: parsed.notes ?? null,
        proficiency: parsed.proficiency,
        skill: parsed.skill,
      })
      .returning();

    return result;
  });
