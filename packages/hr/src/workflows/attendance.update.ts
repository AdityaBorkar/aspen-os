import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { minLength, object, parse, pipe, string } from "valibot";

import { attendance } from "../db-schemas";
import { UpdateAttendanceSchema } from "../types";

const InputSchema = object({
  id: pipe(string(), minLength(1, "id is required")),
  patch: UpdateAttendanceSchema,
});

export const update = Workflow.name("hr.attendance.update")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { id, patch } = input;

    const parsed = parse(UpdateAttendanceSchema, patch);

    const [updated] = await ctx.db
      .update(attendance)
      .set({
        ...parsed,
        checkInTime: parsed.checkInTime
          ? new Date(parsed.checkInTime)
          : undefined,
        checkOutTime: parsed.checkOutTime
          ? new Date(parsed.checkOutTime)
          : undefined,
        updatedAt: new Date(),
      })
      .where(eq(attendance.id, id))
      .returning();

    return updated;
  });
