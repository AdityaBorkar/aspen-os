import { designation } from "#/db-schemas";

import { Workflow } from "@aspen-os/platform/server";
import { object } from "valibot";

const InputSchema = object({});

export const listDesignations = Workflow.name("hr.setup.list-designations")
  .input(InputSchema)
  .handler(async (_input, ctx) => ctx.db.select().from(designation));
