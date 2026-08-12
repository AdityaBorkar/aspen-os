import { Workflow } from "@aspen-os/platform/server";
import { object } from "valibot";

import { shiftSchedule } from "../db-schemas";

const InputSchema = object({});

export const listShiftSchedules = Workflow.name("hr.shift.list-shift-schedules")
  .input(InputSchema)
  .handler(async (_input, ctx) => {
    return ctx.db.select().from(shiftSchedule);
  });
