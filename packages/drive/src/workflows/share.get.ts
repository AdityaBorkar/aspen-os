import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";

import { driveShare } from "../db-schemas";
import { WithIdSchema } from "./utils";

export const getShareById = Workflow.name("drive.share.get-by-id")
  .input(WithIdSchema)
  .handler(async ({ id }, ctx) => {
    const [share] = await ctx.db.select().from(driveShare).where(eq(driveShare.id, id)).limit(1);

    if (!share) {
      throw new Error(`Share with id "${id}" not found.`);
    }

    return share;
  });
