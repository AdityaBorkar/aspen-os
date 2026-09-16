import { shiftType } from "#/db-schemas";

import { Workflow } from "@aspen-os/platform/server";
import { object } from "valibot";

const InputSchema = object({});

export const listShiftTypes = Workflow.name("hr.shift.type.list")
  .input(InputSchema)
  .handler(async (_input, ctx) => ctx.db.select().from(shiftType));
