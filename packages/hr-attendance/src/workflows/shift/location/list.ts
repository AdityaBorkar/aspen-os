import { shiftLocation } from "#/db-schemas";

import { Workflow } from "@aspen-os/platform/server";
import { object } from "valibot";

const InputSchema = object({});

export const listShiftLocations = Workflow.name("hr.shift.location.list")
  .input(InputSchema)
  .handler(async (_input, ctx) => ctx.db.select().from(shiftLocation));
