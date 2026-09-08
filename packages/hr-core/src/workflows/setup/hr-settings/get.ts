import { hrSettings } from "#/db-schemas";

import { Workflow } from "@aspen-os/platform/server";
import { object } from "valibot";

const InputSchema = object({});

export const getHrSettings = Workflow.name("hr.setup.get-hr-settings")
  .input(InputSchema)
  .handler(async (_input, ctx) => {
    const [settings] = await ctx.db.select().from(hrSettings).limit(1);
    return settings ?? null;
  });
