import { productsItemPrice } from "#/db-schemas";
import { GetExpiringPricesSchema } from "#/schemas";
import { isValidOn, toDateKey } from "#/services/price-fetch-service";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq, isNotNull } from "drizzle-orm";

export const getExpiringPrices = Workflow.name("products.price-fetch.get-expiring")
  .input(GetExpiringPricesSchema)
  .handler(async (input, ctx) =>
    ctx.step.run("query", async () => {
      if (!(input.daysAhead >= 0)) {
        throw new Error("daysAhead must be >= 0.");
      }
      const asOf = input.asOf === null || input.asOf === undefined ? new Date() : input.asOf;
      const asOfKey = toDateKey(asOf);
      const endKey = toDateKey(new Date(asOf.getTime() + input.daysAhead * 86_400_000));
      const rows = await ctx.db
        .select()
        .from(productsItemPrice)
        .where(
          and(eq(productsItemPrice.status, "active"), isNotNull(productsItemPrice.valid_upto)),
        );
      const expiring = rows.filter(
        (row) =>
          isValidOn(row, asOfKey) &&
          row.valid_upto !== null &&
          row.valid_upto > asOfKey &&
          row.valid_upto <= endKey,
      );
      expiring.sort((first, second) => {
        const firstUpto = first.valid_upto ?? "";
        const secondUpto = second.valid_upto ?? "";
        if (firstUpto !== secondUpto) {
          return firstUpto < secondUpto ? -1 : 1;
        }
        return first.id < second.id ? -1 : 1;
      });
      const offset = input.offset ?? 0;
      const limit = input.limit ?? expiring.length;
      return expiring.slice(offset, offset + limit);
    }),
  );
