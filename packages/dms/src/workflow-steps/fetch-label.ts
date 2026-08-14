import { WorkflowStep } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";

import { dmsLabel } from "../db-schemas";
import { WithIdSchema } from "../types";

export const fetchLabelStep = WorkflowStep.name("dms-fetch-label")
  .input(WithIdSchema)
  .handler(async (input, ctx) => {
    const [row] = await ctx.db.select().from(dmsLabel).where(eq(dmsLabel.id, input.id)).limit(1);
    if (!row) {
      throw new Error(`Label with id "${input.id}" not found.`);
    }
    return row;
  });
