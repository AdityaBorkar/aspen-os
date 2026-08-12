import { WorkflowStep } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";

import { driveLabel } from "../../db-schemas";
import { WithIdSchema } from "../utils";

export const fetchLabelStep = WorkflowStep.name("fetch-label")
  .input(WithIdSchema)
  .handler(async (input, ctx) => {
    const [row] = await ctx.db
      .select()
      .from(driveLabel)
      .where(eq(driveLabel.id, input.id))
      .limit(1);
    if (!row) throw new Error(`Label with id "${input.id}" not found.`);
    return row;
  });
