import { accountingSalesInvoice } from "#/db-schemas/sales";
import { SALES_INVOICE_EVENTS } from "#/pubsub";
import { resolveReceivableAccount } from "#/services/accounts-service";
import { assertPeriodOpen } from "#/services/fiscal-service";
import { postGlEntries } from "#/services/gl-service";
import { assertLedgerAccount, nextInvoiceStatus } from "#/services/invoice-common";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { GL_TOLERANCE, parseMoney, roundMoney, toMoney } from "#/utils/money";
import { assertUpdated } from "#/workflows/utils";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { minLength, number, object, pipe, string } from "valibot";

const InputSchema = object({
  amount: number(),
  id: string(),
  writeOffAccount: pipe(string(), minLength(1, "writeOffAccount is required")),
});

export const writeOffSalesInvoice = Workflow.name("accounting.sales-invoice.write-off")
  .input(InputSchema)
  .handler(async ({ amount, id, writeOffAccount }, ctx) => {
    if (amount <= 0) {
      throw new Error("Write-off amount must be positive.");
    }
    const [invoice] = await ctx.db
      .select()
      .from(accountingSalesInvoice)
      .where(eq(accountingSalesInvoice.id, id))
      .limit(1);
    if (!invoice) {
      throw new Error(`Sales invoice "${id}" not found.`);
    }
    const outstanding = parseMoney(invoice.outstanding_amount);
    if (amount - outstanding > GL_TOLERANCE) {
      throw new Error("Write-off amount cannot exceed outstanding.");
    }
    await assertLedgerAccount(ctx.db, writeOffAccount, "write-off");

    const year = await assertPeriodOpen({ db: ctx.db, postingDate: invoice.posting_date });
    const receivableAccount = await resolveReceivableAccount(ctx.db);

    await ctx.db.transaction(async (tx) => {
      await postGlEntries({
        db: tx,
        fiscalYear: year.name,
        postingDate: invoice.posting_date,
        rows: [
          { accountId: writeOffAccount, debit: amount },
          {
            accountId: receivableAccount,
            credit: amount,
            partyId: invoice.customer_id,
            partyType: "customer",
          },
        ],
        voucherId: id,
        voucherType: "Sales Invoice",
      });
      const nextWrittenOff = roundMoney(parseMoney(invoice.written_off_amount) + amount);
      const nextOutstanding = roundMoney(outstanding - amount);
      const nextAllocated = parseMoney(invoice.allocated_amount);
      const status = nextInvoiceStatus(Math.max(0, nextOutstanding), nextAllocated, nextWrittenOff);
      await tx
        .update(accountingSalesInvoice)
        .set({
          outstanding_amount: toMoney(Math.max(0, nextOutstanding)),
          status,
          updated_at: new Date(),
          written_off_amount: toMoney(nextWrittenOff),
        })
        .where(eq(accountingSalesInvoice.id, id));
    });

    const [updated] = await ctx.db
      .select()
      .from(accountingSalesInvoice)
      .where(eq(accountingSalesInvoice.id, id))
      .limit(1);
    const row = assertUpdated(updated, `Sales invoice "${id}"`);

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.UPDATED,
        crudAction: "update",
        entityId: id,
        entityType: AUDIT_ENTITY_TYPE.SALES_INVOICE,
        newState: { writtenOff: amount },
      });
      if (parseMoney(row.outstanding_amount) <= GL_TOLERANCE) {
        await ctx.pubsub.publish(SALES_INVOICE_EVENTS.PAID, { salesInvoiceId: id });
      }
    });

    return row;
  });
