import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object } from "valibot";

import { status } from "../db-schemas/status";
import { IdSchema } from "../types";

export const deleteStatus = Workflow.name("status.delete")
  .input(object({ id: IdSchema }))
  .handler(async ({ id }, ctx) => {
    await ctx.db.delete(status).where(eq(status.id, id));
  });
