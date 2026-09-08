import { employeeCheckin } from "#/db-schemas";
import { CreateCheckinSchema } from "#/types";

import { Workflow } from "@aspen-os/platform/server";
import { object } from "valibot";

const InputSchema = object({
  input: CreateCheckinSchema,
});

export const createCheckin = Workflow.name("hr.attendance.create-checkin")
  .input(InputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = input;

    const [result] = await ctx.db
      .insert(employeeCheckin)
      .values({
        device_id: parsed.deviceId ?? null,
        employee_id: parsed.employeeId,
        is_off_shift: parsed.isOffShift ?? false,
        latitude: parsed.latitude ?? null,
        log_type: parsed.logType,
        longitude: parsed.longitude ?? null,
        metadata: parsed.metadata ?? null,
        shift: parsed.shift ?? null,
        time: new Date(parsed.time),
      })
      .returning();

    return result;
  });
