import { employeeGrade } from "#/db-schemas";

import { Workflow } from "@aspen-os/platform/server";
import { object } from "valibot";

const InputSchema = object({});

export const listEmployeeGrades = Workflow.name("hr.config.employee-grade.list")
  .input(InputSchema)
  .handler(async (_input, ctx) => ctx.db.select().from(employeeGrade));
