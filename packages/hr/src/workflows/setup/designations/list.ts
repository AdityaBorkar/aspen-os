import { Workflow } from "@aspen-os/platform/server";
import { object } from "valibot";

import { designation } from "../../../db-schemas";

const InputSchema = object({});

export const listDesignations = Workflow.name("hr.setup.list-designations")
  .input(InputSchema)
  .handler(async (_input, ctx) => ctx.db.select().from(designation));
