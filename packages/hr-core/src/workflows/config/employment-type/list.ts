import { employmentType } from "#/db-schemas";

import { Workflow } from "@aspen-os/platform/server";
import { object } from "valibot";

const InputSchema = object({});

export const listEmploymentTypes = Workflow.name("hr.config.employment-type.list")
  .input(InputSchema)
  .handler(async (_input, ctx) => ctx.db.select().from(employmentType));
