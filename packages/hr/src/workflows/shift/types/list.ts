import { Workflow } from "@aspen-os/platform/server";
import { object } from "valibot";

import { shiftType } from "../../../db-schemas";

const InputSchema = object({});

export const listShiftTypes = Workflow.name("hr.shift.list-shift-types")
  .input(InputSchema)
  .handler(async (_input, ctx) => ctx.db.select().from(shiftType));
