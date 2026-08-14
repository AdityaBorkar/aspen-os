import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { minLength, object, pipe, string } from "valibot";

import { employee } from "../../../db-schemas";

const InputSchema = object({
  dateOfLeaving: pipe(string(), minLength(1, "dateOfLeaving is required")),
  id: pipe(string(), minLength(1, "id is required")),
});

export const markAsLeft = Workflow.name("hr.employee.mark-as-left")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { id, dateOfLeaving } = input;

    const [updated] = await ctx.db
      .update(employee)
      .set({
        dateOfLeaving,
        status: "left",
        updatedAt: new Date(),
      })
      .where(eq(employee.id, id))
      .returning();

    return updated;
  });
