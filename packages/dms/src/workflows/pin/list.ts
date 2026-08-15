import { dmsPin } from "#/db-schemas";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";

export const listPins = Workflow.name("dms.pin.list").handler(
  async (input: { userId: string }, ctx) => {
    const rows = await ctx.db
      .select()
      .from(dmsPin)
      .where(eq(dmsPin.userId, input.userId))
      .orderBy(dmsPin.sortOrder);
    return rows;
  },
);
