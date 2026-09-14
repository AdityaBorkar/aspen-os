import { healthcareCreditDebitNote } from "#/db-schemas/billing";
import { BILLING_EVENTS } from "#/pubsub";
import { IssueCndnSchema } from "#/schemas/billing";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchInvoiceStep } from "#/workflow-steps/fetch-invoice";
import { nextHealthcareSeries } from "#/workflow-steps/series";

import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

const CndnIssueInputSchema = object({ input: IssueCndnSchema });

export const cndnIssue = Workflow.name("healthcare.billing.cndn-issue")
  .input(CndnIssueInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(IssueCndnSchema, input);
    const branchId = parsed.branchId ?? "main";
    const invoice = await ctx.step.run(fetchInvoiceStep, { id: parsed.invoiceId });
    if (invoice.status === "draft") {
      throw new Error("Draft invoice needs no credit/debit note; edit the draft instead");
    }
    const no = await ctx.step.run(nextHealthcareSeries, { input: { series: "cndn" } });
    const [row] = await ctx.step.run("insert-cndn", async () =>
      ctx.db
        .insert(healthcareCreditDebitNote)
        .values({
          amount: String(parsed.amount),
          approver: parsed.approver,
          branch_id: branchId,
          invoice_id: invoice.id,
          kind: parsed.kind,
          note_no: `${parsed.kind}-${String(no).padStart(6, "0")}`,
          reason: parsed.reason,
        })
        .returning(),
    );
    if (!row) {
      throw new Error("Failed to issue credit/debit note.");
    }
    const at = new Date().toISOString();
    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.CREATED,
        crudAction: "create",
        entityId: row.id,
        entityType: AUDIT_ENTITY_TYPE.BILLING,
        newState: { amount: row.amount, invoiceId: invoice.id, kind: row.kind },
      });
      await ctx.pubsub.publish(BILLING_EVENTS.CREATED, {
        actorId: ctx.actorId,
        at,
        branchId,
        id: row.id,
      });
    });
    return {
      amount: Number(row.amount),
      id: row.id,
      invoiceId: row.invoice_id,
      kind: row.kind,
      noteNo: row.note_no,
    };
  });
