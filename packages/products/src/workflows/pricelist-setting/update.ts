import { productsPricelistSetting } from "#/db-schemas";
import { UpdatePricelistSettingsSchema } from "#/schemas";
import { getPricelistSettings } from "#/services/price-fetch-service";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { stripUndefined } from "#/utils/strip-undefined";
import { fetchPriceListStep } from "#/workflow-steps/fetch-price-list";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object } from "valibot";

const UpdateInputSchema = object({ patch: UpdatePricelistSettingsSchema });

export const updatePricelistSettings = Workflow.name("products.pricelist-setting.update")
  .input(UpdateInputSchema)
  .handler(async ({ patch }, ctx) => {
    const existing = await ctx.step.run("load", async () => getPricelistSettings(ctx.db));
    if (patch.defaultSellingListId !== undefined && patch.defaultSellingListId !== null) {
      await ctx.step.run(fetchPriceListStep, { id: patch.defaultSellingListId });
    }
    if (patch.defaultBuyingListId !== undefined && patch.defaultBuyingListId !== null) {
      await ctx.step.run(fetchPriceListStep, { id: patch.defaultBuyingListId });
    }
    const updates = stripUndefined({
      allow_batch_specific: patch.allowBatchSpecific,
      allow_party_specific: patch.allowPartySpecific,
      default_buying_list_id: patch.defaultBuyingListId,
      default_selling_list_id: patch.defaultSellingListId,
      require_validity: patch.requireValidity,
    });
    if (Object.keys(updates).length === 0) {
      return existing;
    }
    const [row] = await ctx.db
      .update(productsPricelistSetting)
      .set({ ...updates, updated_at: new Date() })
      .where(eq(productsPricelistSetting.id, existing.id))
      .returning();
    if (!row) {
      throw new Error("Failed to update pricelist settings.");
    }
    await ctx.step.run("audit", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.UPDATED,
        changes: updates,
        crudAction: "update",
        entityId: row.id,
        entityType: AUDIT_ENTITY_TYPE.PRICELIST_SETTING,
      });
    });
    return row;
  });
