import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { minLength, object, parse, pipe, string } from "valibot";

import { attendanceRequest } from "../../../db-schemas";
import { UpdateAttendanceRequestSchema } from "../../../types";

const InputSchema = object({
  id: pipe(string(), minLength(1, "id is required")),
  patch: UpdateAttendanceRequestSchema,
});

export const updateAttendanceRequest = Workflow.name("hr.attendance.update-attendance-request")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { id, patch } = input;

    const parsed = parse(UpdateAttendanceRequestSchema, patch);

    const [updated] = await ctx.db
      .update(attendanceRequest)
      .set({ ...parsed, updatedAt: new Date() })
      .where(eq(attendanceRequest.id, id))
      .returning();

    return updated;
  });
