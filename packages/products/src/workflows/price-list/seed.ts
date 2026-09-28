import { productsPriceList } from "#/db-schemas";
import { PRICE_LIST_EVENTS } from "#/pubsub";
import {
  AUDIT_ACTION,
  AUDIT_ENTITY_TYPE,
  STANDARD_BUYING_PRICE_LIST,
  STANDARD_SELLING_PRICE_LIST,
} from "#/utils/constants";

import { Workflow } from "@aspen-os/platform/server";
import { inArray } from "drizzle-orm";
import { object } from "valibot";

const STANDARDS = [
  { applicability: "selling", name: STANDARD_SELLING_PRICE_LIST },
  { applicability: "buying", name: STANDARD_BUYING_PRICE_LIST },
] as const;

export const seedPriceLists = Workflow.name("products.price-list.seed")
  .input(object({}))
  .handler(async (_input, ctx) => {
    // One transaction for both standards: concurrent seeders collapse on the
    // name conflict instead of inserting duplicates, and a failure seeds nothing.
    const created = await ctx.db.transaction(async (tx) =>
      tx
        .insert(productsPriceList)
        .values(
          STANDARDS.map((standard) => ({
            applicability: standard.applicability,
            is_enabled: true,
            name: standard.name,
          })),
        )
        .onConflictDoNothing({ target: productsPriceList.name })
        .returning({
          applicability: productsPriceList.applicability,
          id: productsPriceList.id,
          name: productsPriceList.name,
        }),
    );
    // Publish after commit: notifications only fire for rows that durably exist.
    // oxlint-disable eslint/no-await-in-loop
    for (const row of created) {
      await ctx.audit.write({
        action: AUDIT_ACTION.CREATED,
        crudAction: "create",
        entityId: row.id,
        entityType: AUDIT_ENTITY_TYPE.PRICE_LIST,
        newState: { applicability: row.applicability, name: row.name },
      });
      await ctx.pubsub.publish(PRICE_LIST_EVENTS.CREATED, {
        priceList: { id: row.id, name: row.name },
      });
    }
    // oxlint-enable eslint/no-await-in-loop
    return ctx.step.run("report", async () => {
      const rows = await ctx.db
        .select({ id: productsPriceList.id, name: productsPriceList.name })
        .from(productsPriceList)
        .where(
          inArray(productsPriceList.name, [
            STANDARD_SELLING_PRICE_LIST,
            STANDARD_BUYING_PRICE_LIST,
          ]),
        );
      const createdIds = new Set(created.map((row) => row.id));
      return rows.map((row) => ({ created: createdIds.has(row.id), id: row.id, name: row.name }));
    });
  });
