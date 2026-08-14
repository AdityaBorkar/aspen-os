import { Workflow } from "@aspen-os/platform/server";
import { and, eq, or } from "drizzle-orm";

import { dmsFileView } from "../db-schemas";

export const listFileViews = Workflow.name("dms.file-view.list").handler(
  async (input: { ownerId: string }, ctx) =>
    ctx.db
      .select()
      .from(dmsFileView)
      .where(or(eq(dmsFileView.ownerId, input.ownerId), eq(dmsFileView.isShared, true)))
      .orderBy(dmsFileView.name),
);

export const listFileViewsByOwner = Workflow.name("dms.file-view.list-by-owner").handler(
  async (input: { ownerId: string }, ctx) =>
    ctx.db
      .select()
      .from(dmsFileView)
      .where(eq(dmsFileView.ownerId, input.ownerId))
      .orderBy(dmsFileView.name),
);

export const getDefaultFileView = Workflow.name("dms.file-view.get-default").handler(
  async (input: { ownerId: string }, ctx) => {
    const [view] = await ctx.db
      .select()
      .from(dmsFileView)
      .where(and(eq(dmsFileView.ownerId, input.ownerId), eq(dmsFileView.isDefault, true)))
      .limit(1);
    return view ?? null;
  },
);
