import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

import { employeeCheckin } from "../../../db-schemas";
import { CreateCheckinSchema } from "../../../types";

const InputSchema = object({
  input: CreateCheckinSchema,
});

export const createCheckin = Workflow.name("hr.attendance.create-checkin")
  .input(InputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CreateCheckinSchema, input);

    const [result] = await ctx.db
      .insert(employeeCheckin)
      .values({
        deviceId: parsed.deviceId ?? null,
        employeeId: parsed.employeeId,
        isOffShift: parsed.isOffShift ?? false,
        latitude: parsed.latitude ?? null,
        logType: parsed.logType,
        longitude: parsed.longitude ?? null,
        metadata: parsed.metadata ?? null,
        shift: parsed.shift ?? null,
        time: new Date(parsed.time),
      })
      .returning();

    return result;
  });
