import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, string } from "valibot";

import { address } from "../../../db-schemas";
import { fetchAddressStep } from "../../../workflow-steps/fetch-address";
import { unsetPrimaryAddress } from "../../utils";

export const setPrimary = Workflow.name("address.set-primary")
  .input(object({ id: string() }))
  .handler(async (input, ctx) => {
    await ctx.step.run(fetchAddressStep, { id: input.id });
    await unsetPrimaryAddress(ctx.db);

    const [updated] = await ctx.db
      .update(address)
      .set({ isPrimary: true, updatedAt: new Date() })
      .where(eq(address.id, input.id))
      .returning();

    return updated;
  });
