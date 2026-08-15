import { masterAddress } from "#/db-schemas";
import { ListAddressesSchema } from "#/types";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";

export const listAddresses = Workflow.name("masters.address.list")
  .input(ListAddressesSchema)
  .handler(async (input, ctx) =>
    ctx.step.run("query", async () => {
      const parsed = input.filters ?? {};
      const conditions = [
        eq(masterAddress.entityType, input.entityType),
        eq(masterAddress.entityId, input.entityId),
      ];

      if (parsed.country) {
        conditions.push(eq(masterAddress.country, parsed.country.toUpperCase()));
      }
      if (parsed.isPrimary !== undefined) {
        conditions.push(eq(masterAddress.isPrimary, parsed.isPrimary));
      }

      return ctx.db
        .select()
        .from(masterAddress)
        .where(and(...conditions));
    }),
  );
