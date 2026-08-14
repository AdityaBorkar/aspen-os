import { Workflow } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";
import { object, optional, string } from "valibot";

import { dmsItemShare } from "../db-schemas";

const ListSharedWithMeSchema = object({
  opts: optional(object({})),
  userId: string(),
});

export const listSharedWithMe = Workflow.name("dms.item-share.list-shared-with-me")
  .input(ListSharedWithMeSchema)
  .handler(async ({ userId }, ctx) =>
    ctx.db
      .select()
      .from(dmsItemShare)
      .where(and(eq(dmsItemShare.granteeId, userId), eq(dmsItemShare.granteeType, "user")))
      .limit(50)
      .offset(0),
  );
