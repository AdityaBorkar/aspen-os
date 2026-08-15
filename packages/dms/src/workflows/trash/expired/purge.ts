import { runAutoPurge } from "#/services/purge-service";
import type { PurgeDeps } from "#/services/purge-service";

import { Workflow } from "@aspen-os/platform/server";
import { object } from "valibot";

const PurgeInputSchema = object({});

export const purgeExpiredTrash = Workflow.name("dms.trash.purge-expired")
  .input(PurgeInputSchema)
  .handler(async (_input, ctx) => {
    const deps: PurgeDeps = {
      audit: ctx.audit,
      db: ctx.db,
      pubsub: ctx.pubsub,
    };
    return runAutoPurge(deps);
  });
