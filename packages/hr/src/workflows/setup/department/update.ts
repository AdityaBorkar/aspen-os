import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { minLength, object, parse, pipe, string } from "valibot";

import { department } from "../../../db-schemas";
import { UpdateDepartmentSchema } from "../../../types";
import { ensureDepartmentCodeUnique, validateParentDepartment } from "../../utils";

const InputSchema = object({
  id: pipe(string(), minLength(1, "id is required")),
  patch: UpdateDepartmentSchema,
});

export const updateDepartment = Workflow.name("hr.setup.update-department")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { id, patch } = input;

    const parsed = parse(UpdateDepartmentSchema, patch);

    if (parsed.code !== undefined) {
      await ensureDepartmentCodeUnique(ctx.db, parsed.code, id);
    }

    if (parsed.parentDepartment !== undefined && parsed.parentDepartment !== null) {
      if (parsed.parentDepartment === id) {
        throw new Error("A department cannot be its own parent.");
      }
      await validateParentDepartment(ctx.db, parsed.parentDepartment, id);
    }

    const [updated] = await ctx.db
      .update(department)
      .set({
        ...parsed,
        code: parsed.code?.toUpperCase(),
        updatedAt: new Date(),
      })
      .where(eq(department.id, id))
      .returning();

    return updated;
  });
