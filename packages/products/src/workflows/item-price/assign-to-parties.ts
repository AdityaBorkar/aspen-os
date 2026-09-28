import { productsItemPrice } from "#/db-schemas";
import type { NewProductsItemPrice } from "#/db-schemas/item-price";
import { ITEM_PRICE_EVENTS } from "#/pubsub";
import { AssignItemPriceToPartiesSchema } from "#/schemas";
import { validateItemPriceValues } from "#/services/pricing-validation";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";

import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

const AssignInputSchema = object({ input: AssignItemPriceToPartiesSchema });

export const assignItemPriceToParties = Workflow.name("products.item-price.assign-to-parties")
  .input(AssignInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(AssignItemPriceToPartiesSchema, input);
    const customers = parsed.customerIds ?? [];
    const suppliers = parsed.supplierIds ?? [];
    if (customers.length === 0 && suppliers.length === 0) {
      throw new Error("Provide at least one customerId or supplierId.");
    }
    if (customers.length > 0 && suppliers.length > 0) {
      throw new Error("Assign to customers or suppliers in one call, never both.");
    }
    const parties = [
      ...customers.map((customerId) => ({ customerId, supplierId: null })),
      ...suppliers.map((supplierId) => ({ customerId: null, supplierId })),
    ];

    const common = {
      batchNo: null,
      itemId: parsed.itemId,
      leadTimeDays: parsed.leadTimeDays ?? null,
      minQty: parsed.minQty ?? null,
      note: parsed.note ?? null,
      packingUnit: parsed.packingUnit ?? null,
      priceListId: parsed.priceListId,
      rate: parsed.rate,
      status: "active",
      uom: parsed.uom ?? null,
      validFrom: parsed.validFrom ?? null,
      validUpto: parsed.validUpto ?? null,
    } as const;
    const drafts = [];
    for (const party of parties) {
      drafts.push({ ...common, ...party });
    }

    // Validate everything before writing anything; the insert below is atomic.
    const validated: NewProductsItemPrice[] = await Promise.all(
      drafts.map(async (draft) => validateItemPriceValues(ctx.db, draft)),
    );
    const created = await ctx.db.transaction(async (tx) => {
      const rows = [];
      // oxlint-disable eslint/no-await-in-loop
      for (const values of validated) {
        const [row] = await tx.insert(productsItemPrice).values(values).returning();
        if (!row) {
          throw new Error("Failed to assign item price.");
        }
        rows.push(row);
      }
      // oxlint-enable eslint/no-await-in-loop
      return rows;
    });
    // One durable step for the whole batch: per-row step names would collide on replay.
    await ctx.step.run("audit-and-notify", async () => {
      await Promise.all(
        created.map(async (row) => {
          const party =
            row.customer_id !== null
              ? { customerId: row.customer_id }
              : { supplierId: row.supplier_id };
          await ctx.audit.write({
            action: AUDIT_ACTION.CREATED,
            crudAction: "create",
            entityId: row.id,
            entityType: AUDIT_ENTITY_TYPE.ITEM_PRICE,
            newState: { ...party, itemId: row.item_id, priceListId: row.price_list_id },
          });
          await ctx.pubsub.publish(ITEM_PRICE_EVENTS.CREATED, {
            itemPrice: { id: row.id, itemId: row.item_id, priceListId: row.price_list_id },
          });
        }),
      );
    });
    return { count: created.length, createdIds: created.map((row) => row.id) };
  });
