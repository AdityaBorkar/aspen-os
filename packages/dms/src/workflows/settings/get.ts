import { getSetting } from "#/services/settings-service";

import { Workflow } from "@aspen-os/platform/server";
import { object, string } from "valibot";

const GetSettingSchema = object({ key: string() });

export const getSettingWorkflow = Workflow.name("dms.settings.get")
  .input(GetSettingSchema)
  .handler(async ({ key }, ctx) => getSetting(ctx.db, key));
