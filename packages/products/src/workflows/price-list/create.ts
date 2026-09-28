import { productsPriceList } from "#/db-schemas";
import { PRICE_LIST_EVENTS } from "#/pubsub";
import { CreatePriceListSchema } from "#/schemas";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, parse } from "valibot";

const CreateInputSchema = object({ input: CreatePriceListSchema });

export const createPriceList = Workflow.name("products.price-list.create")
  .input(CreateInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CreatePriceListSchema, input);
    const name = parsed.name.trim();
    if (name.length === 0) {
      throw new Error("Price list name must not be blank.");
    }
    const [existing] = await ctx.db
      .select({ id: productsPriceList.id })
      .from(productsPriceList)
      .where(eq(productsPriceList.name, name))
      .limit(1);
    if (existing) {
      throw new Error(`Price list "${name}" already exists.`);
    }
    const applicability = parsed.applicability ?? "both";
    if (parsed.defaultCustomerId && applicability === "buying") {
      throw new Error("defaultCustomerId is only allowed when the list covers selling.");
    }
    if (parsed.defaultSupplierId && applicability === "selling") {
      throw new Error("defaultSupplierId is only allowed when the list covers buying.");
    }
    const [row] = await ctx.db
      .insert(productsPriceList)
      .values({
        applicability,
        country: parsed.country ?? null,
        currency: parsed.currency ?? null,
        default_customer_id: parsed.defaultCustomerId ?? null,
        default_supplier_id: parsed.defaultSupplierId ?? null,
        is_enabled: parsed.isEnabled ?? true,
        name,
        price_not_uom_dependent: parsed.priceNotUomDependent ?? false,
        territory: parsed.territory ?? null,
      })
      .returning();
    if (!row) {
      throw new Error("Failed to create price list.");
    }
    await ctx.step.run("audit-and-notify", async () => {
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
    });
    return row;
  });
