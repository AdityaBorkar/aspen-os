import { healthcarePharmacyItem } from "#/db-schemas/pharmacy";
import { PHARMACY_EVENTS } from "#/pubsub";
import { ItemUpsertSchema } from "#/schemas/pharmacy";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";

import type { JsonValue } from "@aspen-os/platform/server";
import { Workflow } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";
import { boolean, is, object, parse } from "valibot";

const ItemUpsertInputSchema = object({ input: ItemUpsertSchema });

function readColdChain(payload: Record<string, JsonValue>): boolean {
  return is(boolean(), payload.coldChain) ? payload.coldChain : false;
}

function toDto(row: typeof healthcarePharmacyItem.$inferSelect) {
  return {
    branchId: row.branch_id,
    coldChain: readColdChain(row.payload),
    createdAt: row.created_at.toISOString(),
    gstPct: row.gst_pct === null ? 0 : Number(row.gst_pct),
    hsn: row.hsn,
    id: row.id,
    name: row.name,
    pack: row.pack,
    referenceUomCategory: row.reference_uom_category,
    referenceUomId: row.reference_uom_id,
    reorderLevel: row.reorder_level,
    salt: row.salt,
    schedule: row.schedule,
    strength: row.strength,
    updatedAt: row.updated_at.toISOString(),
  };
}

export const itemUpsert = Workflow.name("healthcare.pharmacy.item-upsert")
  .input(ItemUpsertInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(ItemUpsertSchema, input);
    const branchId = parsed.branchId ?? "main";

    const duplicate = await ctx.step.run("find-duplicate", async () => {
      const [row] = await ctx.db
        .select()
        .from(healthcarePharmacyItem)
        .where(
          and(
            eq(healthcarePharmacyItem.branch_id, branchId),
            eq(healthcarePharmacyItem.salt, parsed.salt),
            eq(healthcarePharmacyItem.strength, parsed.strength),
            eq(healthcarePharmacyItem.pack, parsed.pack),
          ),
        )
        .limit(1);
      return row ?? null;
    });

    if (duplicate) {
      const updated = await ctx.step.run("update-duplicate", async () => {
        const [row] = await ctx.db
          .update(healthcarePharmacyItem)
          .set({
            gst_pct: parsed.gstPct === undefined ? duplicate.gst_pct : String(parsed.gstPct),
            hsn: parsed.hsn ?? duplicate.hsn,
            name: parsed.name,
            payload: {
              ...duplicate.payload,
              coldChain: parsed.coldChain ?? readColdChain(duplicate.payload),
            },
            reference_uom_category: parsed.referenceUomCategory ?? duplicate.reference_uom_category,
            reference_uom_id: parsed.referenceUomId ?? duplicate.reference_uom_id,
            reorder_level: parsed.reorderLevel ?? duplicate.reorder_level,
            schedule: parsed.schedule,
          })
          .where(eq(healthcarePharmacyItem.id, duplicate.id))
          .returning();
        if (!row) {
          throw new Error("Failed to update pharmacy item.");
        }
        return row;
      });

      const dto = { ...toDto(updated), deduped: true as const };
      await ctx.step.run("audit-and-notify", async () => {
        await ctx.audit.write({
          action: AUDIT_ACTION.UPDATED,
          crudAction: "update",
          entityId: updated.id,
          entityType: AUDIT_ENTITY_TYPE.PHARMACY,
          newState: { id: updated.id, name: updated.name },
        });
        await ctx.pubsub.publish(PHARMACY_EVENTS.UPDATED, {
          actorId: ctx.actorId,
          at: new Date().toISOString(),
          branchId,
          id: updated.id,
        });
      });
      return dto;
    }

    const created = await ctx.step.run("create-item", async () => {
      const [row] = await ctx.db
        .insert(healthcarePharmacyItem)
        .values({
          branch_id: branchId,
          gst_pct: String(parsed.gstPct ?? 0),
          hsn: parsed.hsn ?? null,
          name: parsed.name,
          pack: parsed.pack,
          payload: { coldChain: parsed.coldChain ?? false },
          reference_uom_category: parsed.referenceUomCategory ?? null,
          reference_uom_id: parsed.referenceUomId ?? null,
          reorder_level: parsed.reorderLevel ?? 0,
          salt: parsed.salt,
          schedule: parsed.schedule,
          strength: parsed.strength,
        })
        .returning();
      if (!row) {
        throw new Error("Failed to create pharmacy item.");
      }
      return row;
    });

    const dto = { ...toDto(created), deduped: false as const };
    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.CREATED,
        crudAction: "create",
        entityId: created.id,
        entityType: AUDIT_ENTITY_TYPE.PHARMACY,
        newState: { id: created.id, name: created.name },
      });
      await ctx.pubsub.publish(PHARMACY_EVENTS.CREATED, {
        actorId: ctx.actorId,
        at: new Date().toISOString(),
        branchId,
        id: created.id,
      });
    });
    return dto;
  });
