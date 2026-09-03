import { status } from "#/db-schemas/status";
import { IdSchema } from "#/types";
import { requireRow } from "#/workflows/utils";

import { WorkflowStep } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object } from "valibot";

export const fetchStatusStep = WorkflowStep.name("fetch-status")
  .input(object({ id: IdSchema }))
  .handler(async (input, ctx) => {
    const rows = await ctx.db.select().from(status).where(eq(status.id, input.id)).limit(1);

    return requireRow(rows, "Status", input.id);
  });
