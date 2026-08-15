import { address } from "#/db-schemas";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, string } from "valibot";

export const deleteAddress = Workflow.name("address.delete")
  .input(object({ id: string() }))
  .handler(async (input, ctx) => {
    await ctx.db.delete(address).where(eq(address.id, input.id));
  });
