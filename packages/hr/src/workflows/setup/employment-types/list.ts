import { Workflow } from "@aspen-os/platform/server";
import { object } from "valibot";

import { employmentType } from "../../../db-schemas";

const InputSchema = object({});

export const listEmploymentTypes = Workflow.name("hr.setup.list-employment-types")
  .input(InputSchema)
  .handler(async (_input, ctx) => ctx.db.select().from(employmentType));
