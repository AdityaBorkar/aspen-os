import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { minLength, object, pipe, string } from "valibot";

import { attendanceRequest } from "../db-schemas";

const InputSchema = object({
  id: pipe(string(), minLength(1, "id is required")),
});

export const getAttendanceRequestById = Workflow.name("hr.attendance.get-attendance-request-by-id")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { id } = input;

    const [result] = await ctx.db
      .select()
      .from(attendanceRequest)
      .where(eq(attendanceRequest.id, id))
      .limit(1);

    if (!result) {
      throw new Error(`Attendance request with id "${id}" not found.`);
    }

    return result;
  });
