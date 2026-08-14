import { Workflow } from "@aspen-os/platform/server";
import { object } from "valibot";

import { leaveType } from "../../../db-schemas";

const InputSchema = object({});

export const listLeaveTypes = Workflow.name("hr.leave.list-leave-types")
  .input(InputSchema)
  .handler(async (_input, ctx) => ctx.db.select().from(leaveType));
