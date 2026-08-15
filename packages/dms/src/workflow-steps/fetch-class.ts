import { dmsClass } from "#/db-schemas";
import { IdSchema } from "#/types";

import { WorkflowStep } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object } from "valibot";

export const fetchClassStep = WorkflowStep.name("dms-fetch-class")
  .input(object({ id: IdSchema }))
  .handler(async (input, ctx) => {
    const [cls] = await ctx.db.select().from(dmsClass).where(eq(dmsClass.id, input.id)).limit(1);

    if (!cls) {
      throw new Error(`Class with id "${input.id}" not found.`);
    }
    return cls;
  });
