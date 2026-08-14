import { Workflow } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";
import { object, optional, string } from "valibot";

import { driveShare } from "../db-schemas";

const ListSharedWithMeSchema = object({
  opts: optional(object({})),
  userId: string(),
});

export const listSharedWithMe = Workflow.name("drive.share.list-shared-with-me")
  .input(ListSharedWithMeSchema)
  .handler(async ({ userId }, ctx) =>
    ctx.db
      .select()
      .from(driveShare)
      .where(and(eq(driveShare.granteeId, userId), eq(driveShare.granteeType, "user")))
      .limit(50)
      .offset(0),
  );
