import { healthcareStockTransfer } from "#/db-schemas/pharmacy";
import { PHARMACY_EVENTS } from "#/pubsub";
import { TransferAcceptSchema } from "#/schemas/pharmacy";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchStockTransferStep } from "#/workflow-steps/fetch-pharmacy";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, parse } from "valibot";

const TransferAcceptInputSchema = object({ input: TransferAcceptSchema });

export const transferAccept = Workflow.name("healthcare.pharmacy.transfer-accept")
  .input(TransferAcceptInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(TransferAcceptSchema, input);
    const branchId = parsed.branchId ?? "main";

    const trf = await ctx.step.run(fetchStockTransferStep, { id: parsed.transferId });
    if (trf.branch_id !== branchId) {
      throw new Error("Transfer belongs to a different branch; verify the transfer and retry.");
    }
    if (trf.status !== "in-transit") {
      throw new Error(`Transfer is ${trf.status}; only in-transit transfers can be accepted.`);
    }

    const accepted = await ctx.step.run("accept-transfer", async () => {
      const [row] = await ctx.db
        .update(healthcareStockTransfer)
        .set({ accepted_by: parsed.acceptedBy, is_accepted: true, status: "accepted" })
        .where(eq(healthcareStockTransfer.id, trf.id))
        .returning();
      if (!row) {
        throw new Error("Failed to accept transfer.");
      }
      return row;
    });

    const dto = {
      acceptedBy: accepted.accepted_by,
      itemId: accepted.item_id,
      qty: accepted.qty,
      status: accepted.status,
      to: accepted.to_location,
      transferId: accepted.id,
    };
    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.UPDATED,
        crudAction: "update",
        entityId: accepted.id,
        entityType: AUDIT_ENTITY_TYPE.PHARMACY,
        newState: { acceptedBy: accepted.accepted_by, status: accepted.status },
      });
      await ctx.pubsub.publish(PHARMACY_EVENTS.UPDATED, {
        actorId: ctx.actorId,
        at: new Date().toISOString(),
        branchId,
        id: accepted.id,
      });
    });
    return dto;
  });
