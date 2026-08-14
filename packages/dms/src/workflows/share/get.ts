import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";

import { dmsShare } from "../../db-schemas";
import { WithIdSchema } from "../../types";

export const getShareById = Workflow.name("dms.share.get-by-id")
  .input(WithIdSchema)
  .handler(async ({ id }, ctx) => {
    const [row] = await ctx.db.select().from(dmsShare).where(eq(dmsShare.id, id)).limit(1);
    if (!row) {
      throw new Error(`Share with id "${id}" not found.`);
    }
    return row;
  });
