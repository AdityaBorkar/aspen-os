import { healthcarePharmacySale } from "#/db-schemas/pharmacy";
import { PHARMACY_EVENTS } from "#/pubsub";
import { PartialCloseSchema } from "#/schemas/pharmacy";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchPharmacySaleStep } from "#/workflow-steps/fetch-pharmacy";

import type { JsonValue } from "@aspen-os/platform/server";
import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { is, number, object, parse, string } from "valibot";

const PartialCloseInputSchema = object({ input: PartialCloseSchema });

export interface SalePayment {
  [key: string]: string | number;
  amount: number;
  mode: string;
  paidAt: string;
}

const SalePaymentSchema = object({ amount: number(), mode: string(), paidAt: string() });

function isSalePayment(value: JsonValue): value is SalePayment {
  if (value instanceof Date || Array.isArray(value)) {
    return false;
  }
  return is(SalePaymentSchema, value);
}

function readPayments(payload: Record<string, JsonValue>): SalePayment[] {
  const raw = payload.payments;
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw.filter(isSalePayment);
}

export const partialClose = Workflow.name("healthcare.pharmacy.partial-close")
  .input(PartialCloseInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(PartialCloseSchema, input);
    const branchId = parsed.branchId ?? "main";

    const sale = await ctx.step.run(fetchPharmacySaleStep, { id: parsed.saleId });
    if (sale.branch_id !== branchId) {
      throw new Error("Sale belongs to a different branch; verify the sale and retry.");
    }
    if (sale.status === "cancelled") {
      throw new Error("Sale is cancelled; payments cannot be accepted against it.");
    }
    if (parsed.amount <= 0) {
      throw new Error("Payment amount must be positive.");
    }

    const updated = await ctx.step.run("record-payment", async () => {
      const payments: SalePayment[] = [
        ...readPayments(sale.payload),
        { amount: parsed.amount, mode: parsed.mode, paidAt: new Date().toISOString() },
      ];
      const paid = payments.reduce((sum, payment) => sum + payment.amount, 0);
      const total = Number(sale.total);
      const [row] = await ctx.db
        .update(healthcarePharmacySale)
        .set({
          payload: { ...sale.payload, payments },
          status: paid >= total ? "fulfilled" : "partial",
        })
        .where(eq(healthcarePharmacySale.id, sale.id))
        .returning();
      if (!row) {
        throw new Error("Failed to record payment.");
      }
      return { payments, row };
    });

    const paidTotal = updated.payments.reduce((sum, payment) => sum + payment.amount, 0);
    const lastPayment = updated.payments[updated.payments.length - 1];
    if (!lastPayment) {
      throw new Error("Failed to record payment.");
    }
    const dto = {
      paidTotal,
      payment: lastPayment,
      saleId: sale.id,
      status: updated.row.status,
      total: Number(sale.total),
    };
    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.UPDATED,
        crudAction: "update",
        entityId: sale.id,
        entityType: AUDIT_ENTITY_TYPE.PHARMACY,
        newState: { paidTotal, saleId: sale.id, status: updated.row.status },
      });
      await ctx.pubsub.publish(PHARMACY_EVENTS.UPDATED, {
        actorId: ctx.actorId,
        at: new Date().toISOString(),
        branchId,
        id: sale.id,
      });
    });
    return dto;
  });
