import { WorkflowStep } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object } from "valibot";

import { dmsContact } from "../db-schemas";
import { IdSchema } from "../types";

export const fetchContactStep = WorkflowStep.name("dms-fetch-contact")
  .input(object({ id: IdSchema }))
  .handler(async (input, ctx) => {
    const [contact] = await ctx.db
      .select()
      .from(dmsContact)
      .where(eq(dmsContact.id, input.id))
      .limit(1);

    if (!contact) {
      throw new Error(`Contact with id "${input.id}" not found.`);
    }
    return contact;
  });
