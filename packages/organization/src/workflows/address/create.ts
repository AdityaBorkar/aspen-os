import { address } from "#/db-schemas";
import { CreateAddressSchema } from "#/types";
import { unsetPrimaryAddress } from "#/workflows/utils";

import { Workflow } from "@aspen-os/platform/server";
import { object } from "valibot";

const CreateInputSchema = object({ input: CreateAddressSchema });

export const createAddress = Workflow.name("address.create")
  .input(CreateInputSchema)
  .handler(async ({ input }, ctx) => {
    if (input.isPrimary) {
      await unsetPrimaryAddress(ctx.db);
    }

    const [result] = await ctx.db
      .insert(address)
      .values({
        city: input.city ?? null,
        country: input.country.toUpperCase(),
        isPrimary: input.isPrimary ?? false,
        label: input.label ?? null,
        line1: input.line1,
        line2: input.line2 ?? null,
        metadata: input.metadata ?? null,
        postalCode: input.postalCode ?? null,
        state: input.state ?? null,
      })
      .returning();

    return result;
  });
