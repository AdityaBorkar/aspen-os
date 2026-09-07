import { GetSettingSchema } from "#/schemas/setting";
import { getSetting } from "#/workflow-steps/settings-service";

import { Workflow } from "@aspen-os/platform/server";
import { object } from "valibot";

const GetInputSchema = object({ input: GetSettingSchema });

export const getSettingWorkflow = Workflow.name("comms.settings.get")
  .input(GetInputSchema)
  .handler(async ({ input }, ctx) => getSetting(ctx.db, input.key));
