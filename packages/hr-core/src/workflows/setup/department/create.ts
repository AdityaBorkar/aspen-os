import { department } from "#/db-schemas";
import { CreateDepartmentSchema } from "#/types";
import { validateParentDepartment } from "#/workflows/utils";

import { Workflow } from "@aspen-os/platform/server";
import { object } from "valibot";

const InputSchema = object({
  input: CreateDepartmentSchema,
});

export const createDepartment = Workflow.name("hr.setup.create-department")
  .input(InputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = input;

    if (parsed.parentDepartment) {
      await validateParentDepartment(ctx.db, parsed.parentDepartment);
    }

    const [result] = await ctx.db
      .insert(department)
      .values({
        code: parsed.code.toUpperCase(),
        cost_center: parsed.costCenter ?? null,
        headcount: parsed.headcount ?? null,
        manager: parsed.manager ?? null,
        metadata: parsed.metadata ?? null,
        name: parsed.name,
        parent_department: parsed.parentDepartment ?? null,
      })
      .returning();

    return result;
  });
