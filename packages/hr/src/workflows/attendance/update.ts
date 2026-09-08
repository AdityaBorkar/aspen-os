import { attendance } from "#/db-schemas";
import { UpdateAttendanceSchema } from "#/types";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { minLength, object, pipe, string } from "valibot";

const InputSchema = object({
  id: pipe(string(), minLength(1, "id is required")),
  patch: UpdateAttendanceSchema,
});

export const update = Workflow.name("hr.attendance.update")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { id, patch } = input;

    const parsed = patch;

    const [updated] = await ctx.db
      .update(attendance)
      .set({
        ...parsed,
        check_in_time: parsed.checkInTime ? new Date(parsed.checkInTime) : undefined,
        check_out_time: parsed.checkOutTime ? new Date(parsed.checkOutTime) : undefined,
        updated_at: new Date(),
      })
      .where(eq(attendance.id, id))
      .returning();

    return updated;
  });
