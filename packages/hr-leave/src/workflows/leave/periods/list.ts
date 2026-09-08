import { leavePeriod } from "#/db-schemas";

import { Workflow } from "@aspen-os/platform/server";
import { object } from "valibot";

const InputSchema = object({});

export const listLeavePeriods = Workflow.name("hr.leave.list-leave-periods")
  .input(InputSchema)
  .handler(async (_input, ctx) => ctx.db.select().from(leavePeriod));
