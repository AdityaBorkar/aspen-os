import { Workflow } from "@aspen-os/platform/server";
import { object } from "valibot";

import { purgeExpiredInternal } from "./utils";

const PurgeInputSchema = object({});

export const purgeExpired = Workflow.name("drive.trash.purge-expired")
  .input(PurgeInputSchema)
  .handler(async () => {
    await purgeExpiredInternal();
  });
