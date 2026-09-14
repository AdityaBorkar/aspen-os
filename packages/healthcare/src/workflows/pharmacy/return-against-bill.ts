import { healthcarePharmacyBatch, healthcarePharmacyReturn } from "#/db-schemas/pharmacy";
import { PHARMACY_EVENTS } from "#/pubsub";
import { ReturnSchema } from "#/schemas/pharmacy";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchPharmacySaleStep } from "#/workflow-steps/fetch-pharmacy";
import { nextHealthcareSeries } from "#/workflow-steps/series";

import type { JsonValue } from "@aspen-os/platform/server";
import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { is, number, object, parse, string } from "valibot";

const ReturnInputSchema = object({ input: ReturnSchema });

const RETURN_POLICY_DAYS = 7;

interface SoldLine {
  [key: string]: string | number | null;
  itemId: string;
  qty: number;
}

const SoldLineSchema = object({ itemId: string(), qty: number() });

function isSoldLine(value: JsonValue): value is SoldLine {
  if (value instanceof Date || Array.isArray(value)) {
    return false;
  }
  return is(SoldLineSchema, value);
}

function readSoldLines(payload: Record<string, JsonValue>): SoldLine[] {
  const raw = payload.lines;
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw.filter(isSoldLine);
}

export const returnAgainstBill = Workflow.name("healthcare.pharmacy.return-against-bill")
  .input(ReturnInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(ReturnSchema, input);
    const branchId = parsed.branchId ?? "main";

    const original = await ctx.step.run(fetchPharmacySaleStep, { id: parsed.originalBillId });
    if (original.branch_id !== branchId) {
      throw new Error("Original bill belongs to a different branch; verify the bill and retry.");
    }
    const ageDays = Math.floor((Date.now() - original.created_at.getTime()) / 86_400_000);
    if (ageDays > RETURN_POLICY_DAYS) {
      throw new Error(
        `Return window is ${RETURN_POLICY_DAYS} days; this bill is ${ageDays} days old — escalate for exception approval.`,
      );
    }
    const sold = readSoldLines(original.payload);
    for (const line of parsed.items) {
      const soldLine = sold.find((entry) => entry.itemId === line.itemId);
      if (!soldLine || soldLine.qty < line.qty) {
        throw new Error(
          `Return qty exceeds sold qty for ${line.itemId}; check the original bill lines.`,
        );
      }
    }

    const returnNo = await ctx.step.run(nextHealthcareSeries, { input: { series: "return" } });
    const returnItems: SoldLine[] = parsed.items.map((line) => ({
      batchId: line.batchId ?? null,
      disposition: line.disposition ?? "restock",
      itemId: line.itemId,
      qty: line.qty,
    }));
    const created = await ctx.step.run("record-return", async () => {
      const [row] = await ctx.db
        .insert(healthcarePharmacyReturn)
        .values({
          branch_id: branchId,
          original_bill_id: parsed.originalBillId,
          payload: { items: returnItems },
          reason: parsed.reason,
          return_no: `RET-${String(returnNo).padStart(6, "0")}`,
          status: "accepted",
        })
        .returning();
      if (!row) {
        throw new Error("Failed to record return.");
      }
      for (const line of parsed.items) {
        const disposition = line.disposition ?? "restock";
        if (!line.batchId) {
          continue;
        }
        const [batch] = await ctx.db
          .select()
          .from(healthcarePharmacyBatch)
          .where(eq(healthcarePharmacyBatch.id, line.batchId))
          .limit(1);
        if (!batch) {
          continue;
        }
        if (disposition === "restock") {
          await ctx.db
            .update(healthcarePharmacyBatch)
            .set({ qty: batch.qty + line.qty, status: "active" })
            .where(eq(healthcarePharmacyBatch.id, batch.id));
        } else {
          await ctx.db
            .update(healthcarePharmacyBatch)
            .set({
              payload: { ...batch.payload, quarantineReason: parsed.reason },
              status: "quarantined",
            })
            .where(eq(healthcarePharmacyBatch.id, batch.id));
        }
      }
      return row;
    });

    const dto = {
      id: created.id,
      items: parsed.items,
      originalBillId: created.original_bill_id,
      reason: created.reason,
      returnNo: created.return_no,
      status: created.status,
    };
    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.CREATED,
        crudAction: "create",
        entityId: created.id,
        entityType: AUDIT_ENTITY_TYPE.PHARMACY,
        newState: { id: created.id, originalBillId: created.original_bill_id },
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
