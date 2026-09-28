import { productsItemPrice, productsPriceList } from "#/db-schemas";
import { PRICE_LIST_EVENTS } from "#/pubsub";
import { UpdatePriceListSchema } from "#/schemas";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { stripUndefined } from "#/utils/strip-undefined";
import { fetchPriceListStep } from "#/workflow-steps/fetch";
import { eventChanges, runAuditNotifyStep } from "#/workflows/audit";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq, isNotNull } from "drizzle-orm";
import { object, string } from "valibot";

const UpdateInputSchema = object({ id: string(), patch: UpdatePriceListSchema });

export const updatePriceList = Workflow.name("products.price-list.update")
  .input(UpdateInputSchema)
  .handler(async (input, ctx) => {
    const current = await ctx.step.run(fetchPriceListStep, { id: input.id });
    const { patch } = input;

    const nextName = patch.name === undefined ? current.name : patch.name.trim();
    if (nextName.length === 0) {
      throw new Error("Price list name must not be blank.");
    }
    if (nextName !== current.name) {
      const [clash] = await ctx.db
        .select({ id: productsPriceList.id })
        .from(productsPriceList)
        .where(eq(productsPriceList.name, nextName))
        .limit(1);
      if (clash) {
        throw new Error(`Price list "${nextName}" already exists.`);
      }
    }

    const nextApplicability = patch.applicability ?? current.applicability;
    if (nextApplicability === "selling" && current.applicability !== "selling") {
      const [supplierRow] = await ctx.db
        .select({ id: productsItemPrice.id })
        .from(productsItemPrice)
        .where(
          and(
            eq(productsItemPrice.price_list_id, input.id),
            isNotNull(productsItemPrice.supplier_id),
          ),
        )
        .limit(1);
      if (supplierRow) {
        throw new Error("Cannot narrow to selling while supplier-specific rows exist.");
      }
    }
    if (nextApplicability === "buying" && current.applicability !== "buying") {
      const [customerRow] = await ctx.db
        .select({ id: productsItemPrice.id })
        .from(productsItemPrice)
        .where(
          and(
            eq(productsItemPrice.price_list_id, input.id),
            isNotNull(productsItemPrice.customer_id),
          ),
        )
        .limit(1);
      if (customerRow) {
        throw new Error("Cannot narrow to buying while customer-specific rows exist.");
      }
    }

    const nextCustomerId =
      patch.defaultCustomerId === undefined ? current.default_customer_id : patch.defaultCustomerId;
    const nextSupplierId =
      patch.defaultSupplierId === undefined ? current.default_supplier_id : patch.defaultSupplierId;
    if (nextCustomerId !== null && nextApplicability === "buying") {
      throw new Error("defaultCustomerId is only allowed when the list covers selling.");
    }
    if (nextSupplierId !== null && nextApplicability === "selling") {
      throw new Error("defaultSupplierId is only allowed when the list covers buying.");
    }

    const updates = stripUndefined({
      applicability: patch.applicability,
      country: patch.country,
      currency: patch.currency,
      default_customer_id: patch.defaultCustomerId,
      default_supplier_id: patch.defaultSupplierId,
      is_enabled: patch.isEnabled,
      name: patch.name === undefined ? undefined : nextName,
      price_not_uom_dependent: patch.priceNotUomDependent,
      territory: patch.territory,
    });
    if (Object.keys(updates).length === 0) {
      return current;
    }
    const [updated] = await ctx.db
      .update(productsPriceList)
      .set({ ...updates, updated_at: new Date() })
      .where(eq(productsPriceList.id, input.id))
      .returning();
    if (!updated) {
      throw new Error(`Price list with id "${input.id}" not found.`);
    }
    await runAuditNotifyStep(
      ctx,
      {
        action: AUDIT_ACTION.UPDATED,
        changes: updates,
        crudAction: "update",
        entityId: updated.id,
        entityType: AUDIT_ENTITY_TYPE.PRICE_LIST,
      },
      PRICE_LIST_EVENTS.UPDATED,
      {
        changes: eventChanges(updates),
        priceList: { id: updated.id, name: updated.name },
      },
    );
    return updated;
  });
