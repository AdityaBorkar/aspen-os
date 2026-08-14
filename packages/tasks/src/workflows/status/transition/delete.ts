import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object } from "valibot";

import { statusTransition } from "../../../db-schemas/status-transition";
import { IdSchema } from "../../../types";

export const deleteTransition = Workflow.name("status.delete-transition")
  .input(object({ id: IdSchema }))
  .handler(async ({ id }, ctx) => {
    await ctx.db.delete(statusTransition).where(eq(statusTransition.id, id));
  });
