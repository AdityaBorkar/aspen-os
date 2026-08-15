import { masterAddress } from "#/db-schemas";

import { WorkflowStep } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, string } from "valibot";

export const fetchAddressStep = WorkflowStep.name("masters-fetch-address")
  .input(object({ id: string() }))
  .handler(async (input, ctx) => {
    const [result] = await ctx.db
      .select()
      .from(masterAddress)
      .where(eq(masterAddress.id, input.id))
      .limit(1);

    if (!result) {
      throw new Error(`Address with id "${input.id}" not found.`);
    }

    return result;
  });
