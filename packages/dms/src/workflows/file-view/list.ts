import { dmsFileView } from "#/db-schemas";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq, or } from "drizzle-orm";

export const listFileViews = Workflow.name("dms.file-view.list").handler(
  async (input: { ownerId: string }, ctx) =>
    ctx.db
      .select()
      .from(dmsFileView)
      .where(or(eq(dmsFileView.owner_id, input.ownerId), eq(dmsFileView.is_shared, true)))
      .orderBy(dmsFileView.name),
);

export const listFileViewsByOwner = Workflow.name("dms.file-view.list-by-owner").handler(
  async (input: { ownerId: string }, ctx) =>
    ctx.db
      .select()
      .from(dmsFileView)
      .where(eq(dmsFileView.owner_id, input.ownerId))
      .orderBy(dmsFileView.name),
);

export const getDefaultFileView = Workflow.name("dms.file-view.get-default").handler(
  async (input: { ownerId: string }, ctx) => {
    const [view] = await ctx.db
      .select()
      .from(dmsFileView)
      .where(and(eq(dmsFileView.owner_id, input.ownerId), eq(dmsFileView.is_default, true)))
      .limit(1);
    return view ?? null;
  },
);
