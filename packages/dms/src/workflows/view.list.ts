import { Workflow } from "@aspen-os/platform/server";
import { and, eq, or } from "drizzle-orm";

import { dmsView } from "../db-schemas";

export const listViews = Workflow.name("dms.view.list").handler(
  async (input: { ownerId: string }, ctx) =>
    ctx.db
      .select()
      .from(dmsView)
      .where(or(eq(dmsView.ownerId, input.ownerId), eq(dmsView.isShared, true)))
      .orderBy(dmsView.name),
);

export const listViewsByOwner = Workflow.name("dms.view.list-by-owner").handler(
  async (input: { ownerId: string }, ctx) =>
    ctx.db.select().from(dmsView).where(eq(dmsView.ownerId, input.ownerId)).orderBy(dmsView.name),
);

export const getDefaultView = Workflow.name("dms.view.get-default").handler(
  async (input: { ownerId: string }, ctx) => {
    const [view] = await ctx.db
      .select()
      .from(dmsView)
      .where(and(eq(dmsView.ownerId, input.ownerId), eq(dmsView.isDefault, true)))
      .limit(1);
    return view ?? null;
  },
);
