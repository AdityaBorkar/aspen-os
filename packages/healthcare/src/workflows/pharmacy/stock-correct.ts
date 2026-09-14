import { healthcarePharmacyBatch } from "#/db-schemas/pharmacy";
import { PHARMACY_EVENTS } from "#/pubsub";
import { StockCorrectSchema } from "#/schemas/pharmacy";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";

import type { JsonValue } from "@aspen-os/platform/server";
import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, parse } from "valibot";

const StockCorrectInputSchema = object({ input: StockCorrectSchema });

export interface CorrectionNote {
  [key: string]: string | number;
  at: string;
  by: string;
  deltaQty: number;
  reason: string;
}

export const stockCorrect = Workflow.name("healthcare.pharmacy.stock-correct")
  .input(StockCorrectInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(StockCorrectSchema, input);
    const branchId = parsed.branchId ?? "main";

    const [batch] = await ctx.step.run("load-batch", async () =>
      ctx.db
        .select()
        .from(healthcarePharmacyBatch)
        .where(eq(healthcarePharmacyBatch.id, parsed.batchId))
        .limit(1),
    );
    if (!batch) {
      throw new Error("Batch not found; verify the batch and retry.");
    }
    if (batch.branch_id !== branchId) {
      throw new Error("Batch belongs to a different branch; verify the batch and retry.");
    }
    const nextQty = batch.qty + parsed.deltaQty;
    if (nextQty < 0) {
      throw new Error(
        `Correction would drive stock negative (${batch.qty} + ${parsed.deltaQty}); negative stock is blocked.`,
      );
    }
    const note: CorrectionNote = {
      at: new Date().toISOString(),
      by: parsed.correctedBy,
      deltaQty: parsed.deltaQty,
      reason: parsed.reason,
    };
    const raw = batch.payload.corrections;
    const prior: JsonValue[] = Array.isArray(raw) ? raw : [];

    const updated = await ctx.step.run("apply-correction", async () => {
      const [row] = await ctx.db
        .update(healthcarePharmacyBatch)
        .set({
          payload: { ...batch.payload, corrections: [...prior, note] },
          qty: nextQty,
        })
        .where(eq(healthcarePharmacyBatch.id, batch.id))
        .returning();
      if (!row) {
        throw new Error("Failed to record stock correction.");
      }
      return row;
    });

    const dto = {
      batchId: updated.id,
      correction: note,
      itemId: updated.item_id,
      lot: updated.lot,
      qty: updated.qty,
    };
    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.UPDATED,
        crudAction: "update",
        entityId: updated.id,
        entityType: AUDIT_ENTITY_TYPE.PHARMACY,
        newState: { batchId: updated.id, deltaQty: parsed.deltaQty, reason: parsed.reason },
      });
      await ctx.pubsub.publish(PHARMACY_EVENTS.UPDATED, {
        actorId: ctx.actorId,
        at: new Date().toISOString(),
        branchId,
        id: updated.id,
      });
    });
    return dto;
  });
