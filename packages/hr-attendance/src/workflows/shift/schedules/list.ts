import { shiftSchedule } from "#/db-schemas";

import { Workflow } from "@aspen-os/platform/server";
import { object } from "valibot";

const InputSchema = object({});

export const listShiftSchedules = Workflow.name("hr.shift.list-shift-schedules")
  .input(InputSchema)
  .handler(async (_input, ctx) => ctx.db.select().from(shiftSchedule));
