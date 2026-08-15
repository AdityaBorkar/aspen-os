import { masterContact } from "#/db-schemas";

import { WorkflowStep } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, string } from "valibot";

export const fetchContactStep = WorkflowStep.name("masters-fetch-contact")
  .input(object({ id: string() }))
  .handler(async (input, ctx) => {
    const [result] = await ctx.db
      .select()
      .from(masterContact)
      .where(eq(masterContact.id, input.id))
      .limit(1);

    if (!result) {
      throw new Error(`Contact with id "${input.id}" not found.`);
    }

    return result;
  });
