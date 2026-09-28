import { productsItem } from "#/db-schemas";
import { VARIANT_EVENTS } from "#/pubsub";
import { SyncVariantFromTemplateSchema } from "#/schemas";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE, VARIANT_SYNC_ALLOWLIST } from "#/utils/constants";
import { stripUndefined } from "#/utils/strip-undefined";
import { fetchItemStep } from "#/workflow-steps/fetch-item";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";

export const syncVariantFromTemplate = Workflow.name("products.variant.sync-from-template")
  .input(SyncVariantFromTemplateSchema)
  .handler(async (input, ctx) => {
    const variant = await ctx.step.run(fetchItemStep, { id: input.variantId });
    if (!variant.template_item_id) {
      throw new Error(`Item with id "${input.variantId}" is not a variant.`);
    }
    const template = await ctx.step.run(fetchItemStep, { id: variant.template_item_id });

    const requested = input.fields ?? [...VARIANT_SYNC_ALLOWLIST];
    const allowed = new Set<string>(VARIANT_SYNC_ALLOWLIST);
    for (const field of requested) {
      if (!allowed.has(field)) {
        throw new Error(`Field "${field}" is not in the variant sync allowlist.`);
      }
    }
    const wants = (name: string): boolean => requested.includes(name);

    const updates = stripUndefined({
      default_cost_center: wants("defaultCostCenter") ? template.default_cost_center : undefined,
      default_expense_account: wants("defaultExpenseAccount")
        ? template.default_expense_account
        : undefined,
      default_income_account: wants("defaultIncomeAccount")
        ? template.default_income_account
        : undefined,
      default_price_list: wants("defaultPriceList") ? template.default_price_list : undefined,
      default_purchase_uom: wants("defaultPurchaseUom") ? template.default_purchase_uom : undefined,
      default_sales_uom: wants("defaultSalesUom") ? template.default_sales_uom : undefined,
      default_supplier_id: wants("defaultSupplierId") ? template.default_supplier_id : undefined,
      default_warehouse_id: wants("defaultWarehouseId") ? template.default_warehouse_id : undefined,
      deferral_months: wants("deferralMonths") ? template.deferral_months : undefined,
      deferred_account: wants("deferredAccount") ? template.deferred_account : undefined,
      description: wants("description") ? template.description : undefined,
      enable_deferred_expense: wants("enableDeferredExpense")
        ? template.enable_deferred_expense
        : undefined,
      enable_deferred_revenue: wants("enableDeferredRevenue")
        ? template.enable_deferred_revenue
        : undefined,
      grant_commission: wants("grantCommission") ? template.grant_commission : undefined,
      inspection_required_before_delivery: wants("inspectionRequiredBeforeDelivery")
        ? template.inspection_required_before_delivery
        : undefined,
      inspection_required_before_purchase: wants("inspectionRequiredBeforePurchase")
        ? template.inspection_required_before_purchase
        : undefined,
      max_discount_percent: wants("maxDiscountPercent") ? template.max_discount_percent : undefined,
      quality_inspection_template: wants("qualityInspectionTemplate")
        ? template.quality_inspection_template
        : undefined,
      shelf_life_days: wants("shelfLifeDays") ? template.shelf_life_days : undefined,
      warranty_days: wants("warrantyDays") ? template.warranty_days : undefined,
    });
    if (Object.keys(updates).length === 0) {
      return variant;
    }

    const [updated] = await ctx.db
      .update(productsItem)
      .set({ ...updates, updated_at: new Date() })
      .where(eq(productsItem.id, variant.id))
      .returning();
    if (!updated) {
      throw new Error(`Variant with id "${variant.id}" not found.`);
    }

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.SYNCED,
        changes: updates,
        crudAction: "update",
        entityId: updated.id,
        entityType: AUDIT_ENTITY_TYPE.VARIANT,
      });
      await ctx.pubsub.publish(VARIANT_EVENTS.TEMPLATE_UPDATED, {
        changes: updates,
        templateItemId: template.id,
      });
    });

    return updated;
  });
