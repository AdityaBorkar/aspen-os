import { healthcareInvoice, healthcareReceipt } from "#/db-schemas/billing";
import { healthcareCounter } from "#/db-schemas/counter";
import { BILLING_EVENTS } from "#/pubsub";
import { CollectPaymentSchema } from "#/schemas/billing";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchInvoiceStep } from "#/workflow-steps/fetch-invoice";

import { Workflow } from "@aspen-os/platform/server";
import { eq, sql } from "drizzle-orm";
import { object, parse } from "valibot";

const CollectInputSchema = object({ input: CollectPaymentSchema });

export const collect = Workflow.name("healthcare.billing.collect")
  .input(CollectInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CollectPaymentSchema, input);
    const branchId = parsed.branchId ?? "main";
    const invoice = await ctx.step.run(fetchInvoiceStep, { id: parsed.invoiceId });
    if (invoice.status === "draft") {
      throw new Error("Draft invoice cannot collect payment; finalize it first");
    }
    const due = Number(invoice.total) - Number(invoice.paid);
    if (parsed.amount > due) {
      throw new Error("Collection exceeds the due amount; check the balance and retry");
    }
    const splits = parsed.lines ?? [{ amount: parsed.amount, mode: parsed.mode, ref: parsed.ref }];
    const splitTotal = splits.reduce((sum, line) => sum + line.amount, 0);
    if (Math.abs(splitTotal - parsed.amount) > 0.01) {
      throw new Error("Split-mode lines must sum to the collection amount.");
    }
    const paid = Number(invoice.paid) + parsed.amount;
    const status = paid >= Number(invoice.total) ? "paid" : "partial";
    const receipts = await ctx.step.run("insert-receipts", async () => {
      const created = [];
      // oxlint-disable eslint/no-await-in-loop
      for (const [index, line] of splits.entries()) {
        const [counter] = await ctx.db
          .insert(healthcareCounter)
          .values({ last_no: 1, series: "receipt" })
          .onConflictDoUpdate({
            set: { last_no: sql`${healthcareCounter.last_no} + 1` },
            target: healthcareCounter.series,
          })
          .returning({ last_no: healthcareCounter.last_no });
        if (!counter) {
          throw new Error('Failed to advance healthcare series "receipt".');
        }
        const [receipt] = await ctx.db
          .insert(healthcareReceipt)
          .values({
            amount: String(line.amount),
            branch_id: branchId,
            invoice_id: invoice.id,
            mode: line.mode,
            payload: {
              episodeId: parsed.episodeId ?? null,
              isAdvance: parsed.isAdvance ?? false,
              splitIndex: index,
              splits: splits.length,
            },
            receipt_no: `RCP-${String(counter.last_no).padStart(6, "0")}`,
            ref: line.ref ?? parsed.ref ?? null,
            status: "collected",
          })
          .returning();
        if (!receipt) {
          throw new Error("Failed to record receipt.");
        }
        created.push(receipt);
      }
      // oxlint-enable eslint/no-await-in-loop
      return created;
    });
    const [row] = await ctx.step.run("update-invoice", async () =>
      ctx.db
        .update(healthcareInvoice)
        .set({ paid: String(paid), status, updated_at: new Date() })
        .where(eq(healthcareInvoice.id, invoice.id))
        .returning(),
    );
    if (!row) {
      throw new Error("Failed to update invoice balance.");
    }
    const at = new Date().toISOString();
    await ctx.step.run("audit-and-notify", async () => {
      const [first] = receipts;
      await ctx.audit.write({
        action: AUDIT_ACTION.COLLECTED,
        crudAction: "create",
        entityId: first?.id ?? invoice.id,
        entityType: AUDIT_ENTITY_TYPE.BILLING,
        newState: {
          amount: parsed.amount,
          invoiceId: invoice.id,
          modes: splits.map((line) => `${line.mode}:${line.amount}`),
          receiptIds: receipts.map((entry) => entry.id),
        },
      });
      // oxlint-disable eslint/no-await-in-loop
      for (const entry of receipts) {
        await ctx.pubsub.publish(BILLING_EVENTS.COLLECTED, {
          actorId: ctx.actorId,
          at,
          branchId,
          id: entry.id,
        });
      }
      // oxlint-enable eslint/no-await-in-loop
    });
    return {
      invoiceStatus: row.status,
      paid,
      receiptIds: receipts.map((entry) => entry.id),
      receipts: receipts.map((entry) => ({
        amount: Number(entry.amount),
        id: entry.id,
        mode: entry.mode,
        receiptNo: entry.receipt_no,
      })),
    };
  });
