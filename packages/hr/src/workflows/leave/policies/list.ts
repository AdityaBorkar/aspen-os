import { leavePolicy } from "#/db-schemas";

import { Workflow } from "@aspen-os/platform/server";
import { object } from "valibot";

const InputSchema = object({});

export const listLeavePolicies = Workflow.name("hr.leave.list-leave-policies")
  .input(InputSchema)
  .handler(async (_input, ctx) => ctx.db.select().from(leavePolicy));
