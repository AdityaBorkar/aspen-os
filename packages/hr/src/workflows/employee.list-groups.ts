import { Workflow } from "@aspen-os/platform/server";
import { object } from "valibot";

import { employeeGroup } from "../db-schemas";

const InputSchema = object({});

export const listGroups = Workflow.name("hr.employee.list-groups")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    return ctx.db.select().from(employeeGroup);
  });
