import { Workflow } from "@aspen-os/platform/server";
import { object } from "valibot";

import { hrSettings } from "../db-schemas";

const InputSchema = object({});

export const getHrSettings = Workflow.name("hr.setup.get-hr-settings")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const [settings] = await ctx.db.select().from(hrSettings).limit(1);
    return settings ?? null;
  });
