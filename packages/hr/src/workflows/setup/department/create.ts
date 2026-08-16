import { department } from "#/db-schemas";
import { CreateDepartmentSchema } from "#/types";
import { validateParentDepartment } from "#/workflows/utils";

import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

const InputSchema = object({
  input: CreateDepartmentSchema,
});

export const createDepartment = Workflow.name("hr.setup.create-department")
  .input(InputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CreateDepartmentSchema, input);

    if (parsed.parentDepartment) {
      await validateParentDepartment(ctx.db, parsed.parentDepartment);
    }

    const [result] = await ctx.db
      .insert(department)
      .values({
        code: parsed.code.toUpperCase(),
        costCenter: parsed.costCenter ?? null,
        headcount: parsed.headcount ?? null,
        manager: parsed.manager ?? null,
        metadata: parsed.metadata ?? null,
        name: parsed.name,
        parentDepartment: parsed.parentDepartment ?? null,
      })
      .returning();

    return result;
  });
