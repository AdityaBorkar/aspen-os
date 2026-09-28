import { accountingBankStatementLine, accountingPaymentEntry } from "#/db-schemas/payment";
import { BANK_EVENTS } from "#/pubsub";
import { MatchBankLineSchema } from "#/schemas/payment";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { parseMoney } from "#/utils/money";
import { assertUpdated } from "#/workflows/utils";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, parse } from "valibot";

const InputSchema = object({ input: MatchBankLineSchema });

export const matchBankLine = Workflow.name("accounting.reconciliation.match-bank")
  .input(InputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(MatchBankLineSchema, input);

    const [line] = await ctx.db
      .select()
      .from(accountingBankStatementLine)
      .where(eq(accountingBankStatementLine.id, parsed.statementLineId))
      .limit(1);
    if (!line) {
      throw new Error(`Bank statement line "${parsed.statementLineId}" not found.`);
    }
    if (line.match_status !== "unmatched") {
      throw new Error("Only unmatched statement lines can be matched.");
    }

    const [payment] = await ctx.db
      .select()
      .from(accountingPaymentEntry)
      .where(eq(accountingPaymentEntry.id, parsed.paymentId))
      .limit(1);
    if (!payment) {
      throw new Error(`Payment entry "${parsed.paymentId}" not found.`);
    }
    if (Math.abs(parseMoney(line.amount) - parseMoney(payment.paid_amount)) > 0.005) {
      throw new Error("Bank line amount must match the payment amount.");
    }

    const [updated] = await ctx.db
      .update(accountingBankStatementLine)
      .set({ match_status: "matched", matched_payment_id: payment.id })
      .where(eq(accountingBankStatementLine.id, line.id))
      .returning();

    const row = assertUpdated(updated, `Bank statement line "${line.id}"`);

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.MATCHED,
        crudAction: "update",
        entityId: line.id,
        entityType: AUDIT_ENTITY_TYPE.PAYMENT,
        newState: { matchedPaymentId: payment.id },
      });
      await ctx.pubsub.publish(BANK_EVENTS.MATCHED, {
        paymentId: payment.id,
        statementLineId: line.id,
      });
    });

    return row;
  });
