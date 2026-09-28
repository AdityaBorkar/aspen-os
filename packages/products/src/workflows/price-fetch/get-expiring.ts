import { productsItemPrice } from "#/db-schemas";
import { GetExpiringPricesSchema } from "#/schemas";
import { toDateKey } from "#/services/pricing-dates";
import { checkPage } from "#/workflows/utils";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq, gt, lte } from "drizzle-orm";

export const getExpiringPrices = Workflow.name("products.price-fetch.get-expiring")
  .input(GetExpiringPricesSchema)
  .handler(async (input, ctx) =>
    ctx.step.run("query", async () => {
      if (!(input.daysAhead >= 0)) {
        throw new Error("daysAhead must be >= 0.");
      }
      checkPage(input);
      const asOf = input.asOf === null || input.asOf === undefined ? new Date() : input.asOf;
      const asOfKey = toDateKey(asOf);
      const endKey = toDateKey(new Date(asOf.getTime() + input.daysAhead * 86_400_000));
      let query = ctx.db
        .select()
        .from(productsItemPrice)
        .where(
          and(
            eq(productsItemPrice.status, "active"),
            lte(productsItemPrice.valid_from, asOfKey),
            gt(productsItemPrice.valid_upto, asOfKey),
            lte(productsItemPrice.valid_upto, endKey),
          ),
        )
        .orderBy(productsItemPrice.valid_upto, productsItemPrice.id)
        .$dynamic();
      if (input.limit !== undefined) {
        query = query.limit(input.limit);
      }
      if (input.offset !== undefined) {
        query = query.offset(input.offset);
      }
      return query;
    }),
  );
