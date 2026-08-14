import { Workflow } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";
import { object, optional, string } from "valibot";

import { dmsPublicLink, dmsShare } from "../db-schemas";

const ListSharedWithMeSchema = object({
  opts: optional(object({})),
  userId: string(),
});

export const listSharedWithMe = Workflow.name("dms.share.list-shared-with-me")
  .input(ListSharedWithMeSchema)
  .handler(async ({ userId }, ctx) => {
    const shares = await ctx.db
      .select()
      .from(dmsShare)
      .where(and(eq(dmsShare.granteeId, userId), eq(dmsShare.granteeType, "user")))
      .limit(50)
      .offset(0);

    const publicLinks = await ctx.db
      .select()
      .from(dmsPublicLink)
      .where(eq(dmsPublicLink.createdBy, userId))
      .limit(50)
      .offset(0);

    return { publicLinks, shares };
  });
