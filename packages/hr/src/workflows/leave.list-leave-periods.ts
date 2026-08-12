import { Workflow } from "@aspen-os/platform/server";
import { object } from "valibot";

import { leavePeriod } from "../db-schemas";

const InputSchema = object({});

export const listLeavePeriods = Workflow.name("hr.leave.list-leave-periods")
  .input(InputSchema)
  .handler(async (_input, ctx) => {
    return ctx.db.select().from(leavePeriod);
  });
