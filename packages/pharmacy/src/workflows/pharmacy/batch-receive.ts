import { healthcarePharmacyBatch } from "#/db-schemas/pharmacy";
import { PHARMACY_EVENTS } from "#/pubsub";
import { BatchReceiveSchema } from "#/schemas/pharmacy";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchPharmacyItemStep } from "#/workflow-steps/fetch-pharmacy";

import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

const BatchReceiveInputSchema = object({ input: BatchReceiveSchema });

function isExpired(expiry: string): boolean {
  return new Date(expiry).getTime() < Date.now();
}

function daysToExpiry(expiry: string): number {
  return Math.floor((new Date(expiry).getTime() - Date.now()) / 86_400_000);
}

export const batchReceive = Workflow.name("pharmacy.batch-receive")
  .input(BatchReceiveInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(BatchReceiveSchema, input);
    const branchId = parsed.branchId ?? "main";

    if (isExpired(parsed.expiry)) {
      throw new Error("Batch is expired; expired stock cannot be received — reject the lot.");
    }
    const item = await ctx.step.run(fetchPharmacyItemStep, { id: parsed.itemId });
    if (item.branch_id !== branchId) {
      throw new Error("Item belongs to a different branch; verify the item and retry.");
    }

    const location = parsed.location ?? parsed.store ?? "main-store";
    const days = daysToExpiry(parsed.expiry);
    const created = await ctx.step.run("receive-batch", async () => {
      const [row] = await ctx.db
        .insert(healthcarePharmacyBatch)
        .values({
          branch_id: branchId,
          expiry: parsed.expiry,
          item_id: parsed.itemId,
          location,
          lot: parsed.lot,
          mrp: String(parsed.mrp),
          qty: parsed.qty,
          rate: String(parsed.rate),
          status: days < 90 ? "near-expiry" : "active",
        })
        .returning();
      if (!row) {
        throw new Error("Failed to receive batch.");
      }
      return row;
    });

    const dto = {
      batchId: created.id,
      expiry: created.expiry,
      id: created.id,
      itemId: created.item_id,
      location: created.location,
      lot: created.lot,
      mrp: Number(created.mrp),
      nearExpiryAlert: days < 90,
      qty: created.qty,
      rate: Number(created.rate),
      receivedAt: created.created_at.toISOString(),
      status: created.status,
    };
    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.CREATED,
        crudAction: "create",
        entityId: created.id,
        entityType: AUDIT_ENTITY_TYPE.PHARMACY,
        newState: { id: created.id, itemId: created.item_id, lot: created.lot },
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
