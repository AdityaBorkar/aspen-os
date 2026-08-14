import { Workflow } from "@aspen-os/platform/server";
import { object } from "valibot";

import { type ItemPurgeDeps, purgeExpiredItemsInternal } from "../services/item-purge-service";

const PurgeInputSchema = object({});

export const purgeExpiredItemTrash = Workflow.name("dms.trash.purge-expired")
  .input(PurgeInputSchema)
  .handler(async (_input, ctx) => {
    const deps: ItemPurgeDeps = {
      audit: ctx.audit,
      db: ctx.db,
      pubsub: ctx.pubsub,
    };
    await purgeExpiredItemsInternal(deps);
  });
