import { employeeGrade } from "#/db-schemas";

import { Workflow } from "@aspen-os/platform/server";
import { object } from "valibot";

const InputSchema = object({});

export const listEmployeeGrades = Workflow.name("hr.setup.list-employee-grades")
  .input(InputSchema)
  .handler(async (_input, ctx) => ctx.db.select().from(employeeGrade));
