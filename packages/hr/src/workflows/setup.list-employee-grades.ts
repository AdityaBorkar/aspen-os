import { Workflow } from "@aspen-os/platform/server";
import { object } from "valibot";

import { employeeGrade } from "../db-schemas";

const InputSchema = object({});

export const listEmployeeGrades = Workflow.name("hr.setup.list-employee-grades")
  .input(InputSchema)
  .handler(async (_input, ctx) => {
    return ctx.db.select().from(employeeGrade);
  });
