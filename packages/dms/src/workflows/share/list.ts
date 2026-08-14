import { Workflow } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";

import { dmsShare } from "../../db-schemas";

export const listShares = Workflow.name("dms.share.list").handler(
  async (input: { entityId: string; entityType: "file" | "folder" }, ctx) =>
    ctx.db
      .select()
      .from(dmsShare)
      .where(and(eq(dmsShare.entityId, input.entityId), eq(dmsShare.entityType, input.entityType))),
);

export const listSharesByGrantee = Workflow.name("dms.share.list-by-grantee").handler(
  async (input: { granteeId: string; granteeType: "user" | "group" | "contact" }, ctx) =>
    ctx.db
      .select()
      .from(dmsShare)
      .where(
        and(eq(dmsShare.granteeId, input.granteeId), eq(dmsShare.granteeType, input.granteeType)),
      ),
);
