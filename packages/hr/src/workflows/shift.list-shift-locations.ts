import { Workflow } from "@aspen-os/platform/server";
import { object } from "valibot";

import { shiftLocation } from "../db-schemas";

const InputSchema = object({});

export const listShiftLocations = Workflow.name("hr.shift.list-shift-locations")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    return ctx.db.select().from(shiftLocation);
  });
