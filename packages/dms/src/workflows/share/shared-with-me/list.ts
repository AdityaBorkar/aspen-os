import { dmsPublicLink, dmsShare } from "#/db-schemas";
import { ListSharedWithMeOptionsSchema } from "#/types";
import type { ListSharedWithMeOptions } from "#/types";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";
import { object, optional, string } from "valibot";

const ListSharedWithMeSchema = object({
  opts: optional(ListSharedWithMeOptionsSchema),
  userId: string(),
});

export const listSharedWithMe = Workflow.name("dms.share.list-shared-with-me")
  .input(ListSharedWithMeSchema)
  .handler(async ({ userId, opts }: { opts?: ListSharedWithMeOptions; userId: string }, ctx) => {
    const limit = opts?.limit ?? 50;
    const offset = opts?.offset ?? 0;

    const shares = await ctx.db
      .select()
      .from(dmsShare)
      .where(and(eq(dmsShare.grantee_id, userId), eq(dmsShare.grantee_type, "user")))
      .limit(limit)
      .offset(offset);

    const createdPublicLinks = await ctx.db
      .select()
      .from(dmsPublicLink)
      .where(eq(dmsPublicLink.created_by, userId))
      .limit(limit)
      .offset(offset);

    return {
      createdPublicLinks,
      publicLinks: createdPublicLinks,
      publicLinksCreatedByMe: createdPublicLinks,
      shares,
    };
  });
