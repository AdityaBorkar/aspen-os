import { WorkflowStep } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object } from "valibot";

import { dmsDocumentClass } from "../../db-schemas";
import { IdSchema } from "../../types";

export const fetchDocumentClassStep = WorkflowStep.name("dms-fetch-class")
  .input(object({ id: IdSchema }))
  .handler(async (input, ctx) => {
    const [cls] = await ctx.db
      .select()
      .from(dmsDocumentClass)
      .where(eq(dmsDocumentClass.id, input.id))
      .limit(1);

    if (!cls) {
      throw new Error(`Document class with id "${input.id}" not found.`);
    }
    return cls;
  });
