import { employee } from "#/db-schemas";
import { UpdateEmployeeSchema } from "#/types";
import { ensureEmployeeIdUnique } from "#/workflows/utils";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { minLength, object, parse, pipe, string } from "valibot";

const InputSchema = object({
  id: pipe(string(), minLength(1, "id is required")),
  patch: UpdateEmployeeSchema,
});

export const update = Workflow.name("hr.employee.update")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { id, patch } = input;

    const parsed = parse(UpdateEmployeeSchema, patch);

    if (parsed.employeeId !== undefined) {
      await ensureEmployeeIdUnique(ctx.db, parsed.employeeId, id);
    }

    const [updated] = await ctx.db
      .update(employee)
      .set({ ...parsed, updatedAt: new Date() })
      .where(eq(employee.id, id))
      .returning();

    return updated;
  });
