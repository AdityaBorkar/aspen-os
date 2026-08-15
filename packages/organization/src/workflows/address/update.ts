import { address } from "#/db-schemas";
import { UpdateAddressSchema } from "#/types";
import { fetchAddressStep } from "#/workflow-steps/fetch-address";
import { unsetPrimaryAddress } from "#/workflows/utils";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, string } from "valibot";

const UpdateInputSchema = object({
  id: string(),
  patch: UpdateAddressSchema,
});

export const updateAddress = Workflow.name("address.update")
  .input(UpdateInputSchema)
  .handler(async (input, ctx) => {
    await ctx.step.run(fetchAddressStep, { id: input.id });

    if (input.patch.isPrimary === true) {
      await unsetPrimaryAddress(ctx.db);
    }

    const [updated] = await ctx.db
      .update(address)
      .set({
        city: input.patch.city,
        country: input.patch.country?.toUpperCase(),
        isPrimary: input.patch.isPrimary,
        label: input.patch.label,
        line1: input.patch.line1,
        line2: input.patch.line2,
        metadata: input.patch.metadata,
        postalCode: input.patch.postalCode,
        state: input.patch.state,
        updatedAt: new Date(),
      })
      .where(eq(address.id, input.id))
      .returning();

    return updated;
  });
