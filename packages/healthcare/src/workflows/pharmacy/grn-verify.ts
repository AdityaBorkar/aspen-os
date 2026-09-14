import { healthcareGrn, healthcarePurchaseOrder } from "#/db-schemas/pharmacy";
import { PHARMACY_EVENTS } from "#/pubsub";
import { GrnVerifySchema } from "#/schemas/pharmacy";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchPurchaseOrderStep } from "#/workflow-steps/fetch-pharmacy";
import { nextHealthcareSeries } from "#/workflow-steps/series";

import type { JsonValue } from "@aspen-os/platform/server";
import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { is, number, object, parse, string } from "valibot";

const GrnVerifyInputSchema = object({ input: GrnVerifySchema });

interface PoLine {
  [key: string]: string | number;
  itemId: string;
  qty: number;
}

const PoLineSchema = object({ itemId: string(), qty: number() });

function isPoLine(value: JsonValue): value is PoLine {
  if (value instanceof Date || Array.isArray(value)) {
    return false;
  }
  return is(PoLineSchema, value);
}

export const grnVerify = Workflow.name("healthcare.pharmacy.grn-verify")
  .input(GrnVerifyInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(GrnVerifySchema, input);
    const branchId = parsed.branchId ?? "main";

    const po = await ctx.step.run(fetchPurchaseOrderStep, { id: parsed.poId });
    if (po.branch_id !== branchId) {
      throw new Error("Purchase order belongs to a different branch; verify the PO and retry.");
    }
    if (po.status === "closed") {
      throw new Error("Purchase order is closed; reopen it before verifying a GRN.");
    }
    const rawItems = po.payload.items;
    const ordered: PoLine[] = Array.isArray(rawItems) ? rawItems.filter(isPoLine) : [];
    const toleranceFlags: string[] = [];
    for (const rec of parsed.received) {
      const line = ordered.find((entry) => entry.itemId === rec.itemId);
      if (!line) {
        toleranceFlags.push(rec.itemId);
        continue;
      }
      if (line.qty === 0) {
        toleranceFlags.push(rec.itemId);
        continue;
      }
      const variance = Math.abs(line.qty - rec.qty) / line.qty;
      if (variance > 0.05) {
        toleranceFlags.push(rec.itemId);
      }
    }

    interface ReceivedLine {
      [key: string]: string | number | undefined;
      damagedQty?: number;
      itemId: string;
      qty: number;
      shortQty?: number;
    }
    const received: ReceivedLine[] = parsed.received.map((rec) => ({
      damagedQty: rec.damagedQty,
      itemId: rec.itemId,
      qty: rec.qty,
      shortQty: rec.shortQty,
    }));
    const grnNo = await ctx.step.run(nextHealthcareSeries, { input: { series: "grn" } });
    const created = await ctx.step.run("verify-grn", async () => {
      const [row] = await ctx.db
        .insert(healthcareGrn)
        .values({
          branch_id: branchId,
          grn_no: `GRN-${String(grnNo).padStart(6, "0")}`,
          payload: {
            damagedQty: parsed.damagedQty ?? 0,
            note: parsed.note ?? null,
            received,
            shortQty: parsed.shortQty ?? 0,
            toleranceFlags,
          },
          po_id: parsed.poId,
          status: "verified",
          verified_by: parsed.verifiedBy,
        })
        .returning();
      if (!row) {
        throw new Error("Failed to verify GRN.");
      }
      await ctx.db
        .update(healthcarePurchaseOrder)
        .set({ status: "partial" })
        .where(eq(healthcarePurchaseOrder.id, po.id));
      return row;
    });

    const dto = {
      grnNo: created.grn_no,
      id: created.id,
      poId: created.po_id,
      received: parsed.received,
      status: created.status,
      toleranceFlags,
      verifiedBy: created.verified_by,
    };
    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.UPDATED,
        crudAction: "update",
        entityId: created.id,
        entityType: AUDIT_ENTITY_TYPE.PHARMACY,
        newState: { grnNo: created.grn_no, poId: created.po_id, toleranceFlags },
      });
      await ctx.pubsub.publish(PHARMACY_EVENTS.UPDATED, {
        actorId: ctx.actorId,
        at: new Date().toISOString(),
        branchId,
        id: created.id,
      });
    });
    return dto;
  });
