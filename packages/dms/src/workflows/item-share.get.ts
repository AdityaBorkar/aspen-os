import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";

import { dmsItemShare } from "../db-schemas";
import { WithIdSchema } from "./item-utils";

export const getItemShareById = Workflow.name("dms.item-share.get-by-id")
  .input(WithIdSchema)
  .handler(async ({ id }, ctx) => {
    const [share] = await ctx.db
      .select()
      .from(dmsItemShare)
      .where(eq(dmsItemShare.id, id))
      .limit(1);

    if (!share) {
      throw new Error(`Share with id "${id}" not found.`);
    }

    return share;
  });
