import { WorkflowStep } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";

import { dmsItemShare } from "../../db-schemas";
import { WithIdSchema } from "../item-utils";

export const fetchItemShareStep = WorkflowStep.name("fetch-item-share")
  .input(WithIdSchema)
  .handler(async (input, ctx) => {
    const [row] = await ctx.db
      .select()
      .from(dmsItemShare)
      .where(eq(dmsItemShare.id, input.id))
      .limit(1);
    if (!row) throw new Error(`Share with id "${input.id}" not found.`);
    return row;
  });
