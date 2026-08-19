import { GetSettingSchema } from "#/types";
import { getSetting } from "#/workflow-steps/settings-service";

import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

const GetInputSchema = object({ input: GetSettingSchema });

export const getSettingWorkflow = Workflow.name("comms.settings.get")
  .input(GetInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(GetSettingSchema, input);
    return getSetting(ctx.db, parsed.key);
  });
