import { masterAddress } from "#/db-schemas";
import { ListAddressesSchema } from "#/types";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";
import type { SQL } from "drizzle-orm";

export const listAddresses = Workflow.name("masters.address.list")
  .input(ListAddressesSchema)
  .handler(async (input, ctx) =>
    ctx.step.run("query", async () => {
      const parsed = input.filters ?? {};
      const conditions: SQL[] = [];

      if (input.entityType !== undefined) {
        conditions.push(eq(masterAddress.entity_type, input.entityType));
      }
      if (input.entityId !== undefined) {
        conditions.push(eq(masterAddress.entity_id, input.entityId));
      }
      if (parsed.country) {
        conditions.push(eq(masterAddress.country, parsed.country.toUpperCase()));
      }

      const where = conditions.length > 0 ? and(...conditions) : undefined;

      return ctx.db.select().from(masterAddress).where(where);
    }),
  );
