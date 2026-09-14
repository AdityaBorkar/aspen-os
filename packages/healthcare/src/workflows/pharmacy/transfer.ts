import { healthcareStockTransfer } from "#/db-schemas/pharmacy";
import { PHARMACY_EVENTS } from "#/pubsub";
import { TransferSchema } from "#/schemas/pharmacy";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { nextHealthcareSeries } from "#/workflow-steps/series";

import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

const TransferInputSchema = object({ input: TransferSchema });

export const transfer = Workflow.name("healthcare.pharmacy.transfer")
  .input(TransferInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(TransferSchema, input);
    const branchId = parsed.branchId ?? "main";
    const from = parsed.from ?? "store";

    if (from === parsed.to) {
      throw new Error("Source and destination locations must differ.");
    }

    const transferNo = await ctx.step.run(nextHealthcareSeries, { input: { series: "transfer" } });
    const created = await ctx.step.run("create-transfer", async () => {
      const [row] = await ctx.db
        .insert(healthcareStockTransfer)
        .values({
          batch_id: parsed.batchId ?? null,
          branch_id: branchId,
          from_location: from,
          is_accepted: false,
          item_id: parsed.itemId,
          note: parsed.note ?? null,
          qty: parsed.qty,
          status: "in-transit",
          to_location: parsed.to,
          transfer_no: `TRF-${String(transferNo).padStart(6, "0")}`,
        })
        .returning();
      if (!row) {
        throw new Error("Failed to create stock transfer.");
      }
      return row;
    });

    const dto = {
      batchId: created.batch_id,
      from: created.from_location,
      id: created.id,
      itemId: created.item_id,
      note: created.note,
      qty: created.qty,
      status: created.status,
      to: created.to_location,
      transferNo: created.transfer_no,
    };
    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.CREATED,
        crudAction: "create",
        entityId: created.id,
        entityType: AUDIT_ENTITY_TYPE.PHARMACY,
        newState: { id: created.id, itemId: created.item_id, transferNo: created.transfer_no },
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
