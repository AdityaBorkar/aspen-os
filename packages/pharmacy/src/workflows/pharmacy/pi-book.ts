import { healthcareGrn, healthcarePurchaseInvoice } from "#/db-schemas/pharmacy";
import { PHARMACY_EVENTS } from "#/pubsub";
import { PiBookSchema } from "#/schemas/pharmacy";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchGrnStep } from "#/workflow-steps/fetch-pharmacy";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, parse } from "valibot";

const PiBookInputSchema = object({ input: PiBookSchema });

export const piBook = Workflow.name("pharmacy.pi-book")
  .input(PiBookInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(PiBookSchema, input);
    const branchId = parsed.branchId ?? "main";

    const grn = await ctx.step.run(fetchGrnStep, { id: parsed.grnId });
    if (grn.branch_id !== branchId) {
      throw new Error("GRN belongs to a different branch; verify the GRN and retry.");
    }
    if (grn.status !== "verified") {
      throw new Error("GRN must be verified before invoicing; verify the GRN first and retry.");
    }

    const created = await ctx.step.run("book-invoice", async () => {
      const [row] = await ctx.db
        .insert(healthcarePurchaseInvoice)
        .values({
          amount: String(parsed.amount),
          branch_id: branchId,
          grn_id: parsed.grnId,
          gst_amount: String(parsed.gstAmount ?? 0),
          invoice_no: parsed.invoiceNo,
          status: "booked",
        })
        .returning();
      if (!row) {
        throw new Error("Failed to book purchase invoice.");
      }
      await ctx.db
        .update(healthcareGrn)
        .set({ status: "billed" })
        .where(eq(healthcareGrn.id, grn.id));
      return row;
    });

    const dto = {
      amount: Number(created.amount),
      grnId: created.grn_id,
      gstAmount: Number(created.gst_amount),
      id: created.id,
      invoiceNo: created.invoice_no,
      status: created.status,
    };
    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.CREATED,
        crudAction: "create",
        entityId: created.id,
        entityType: AUDIT_ENTITY_TYPE.PHARMACY,
        newState: { grnId: created.grn_id, id: created.id, invoiceNo: created.invoice_no },
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
