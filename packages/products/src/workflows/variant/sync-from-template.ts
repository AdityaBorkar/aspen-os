import { productsItem } from "#/db-schemas";
import { VARIANT_EVENTS } from "#/pubsub";
import { SyncVariantFromTemplateSchema } from "#/schemas";
import { ITEM_FIELD_MAP, pickSyncFields } from "#/services/item-fields";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE, VARIANT_SYNC_ALLOWLIST } from "#/utils/constants";
import { stripUndefined } from "#/utils/strip-undefined";
import { fetchItemStep } from "#/workflow-steps/fetch";
import { eventChanges, runAuditNotifyStep } from "#/workflows/audit";

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

    const requested = new Set<string>(input.fields ?? [...VARIANT_SYNC_ALLOWLIST]);
    const allowed = new Set<string>(VARIANT_SYNC_ALLOWLIST);
    for (const field of requested) {
      if (!allowed.has(field)) {
        throw new Error(`Field "${field}" is not in the variant sync allowlist.`);
      }
    }

    const updates = stripUndefined(pickSyncFields(template, requested, ITEM_FIELD_MAP));
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

    await runAuditNotifyStep(
      ctx,
      {
        action: AUDIT_ACTION.SYNCED,
        changes: updates,
        crudAction: "update",
        entityId: updated.id,
        entityType: AUDIT_ENTITY_TYPE.VARIANT,
      },
      VARIANT_EVENTS.TEMPLATE_UPDATED,
      {
        changes: eventChanges(updates),
        templateItemId: template.id,
      },
    );

    return updated;
  });
