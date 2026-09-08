import { employeeGroup } from "#/db-schemas";

import { Workflow } from "@aspen-os/platform/server";
import { object } from "valibot";

const InputSchema = object({});

export const listGroups = Workflow.name("hr.employee.list-groups")
  .input(InputSchema)
  .handler(async (_input, ctx) => ctx.db.select().from(employeeGroup));
