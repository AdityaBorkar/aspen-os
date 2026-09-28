import { accountingJournalEntry, accountingJournalLine } from "#/db-schemas/chart";
import { JOURNAL_EVENTS } from "#/pubsub";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { parseMoney, roundMoney, toMoney } from "#/utils/money";
import { assertUpdated } from "#/workflows/utils";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, string } from "valibot";

const InputSchema = object({ id: string() });

export const reverseJournalEntry = Workflow.name("accounting.journal.reverse")
  .input(InputSchema)
  .handler(async ({ id }, ctx) => {
    const [existing] = await ctx.db
      .select()
      .from(accountingJournalEntry)
      .where(eq(accountingJournalEntry.id, id))
      .limit(1);
    if (!existing) {
      throw new Error(`Journal entry "${id}" not found.`);
    }
    if (existing.status !== "submitted") {
      throw new Error("Only submitted journal entries can be reversed.");
    }

    const lines = await ctx.db
      .select()
      .from(accountingJournalLine)
      .where(eq(accountingJournalLine.journal_id, id));

    let totalDebit = 0;
    let totalCredit = 0;
    for (const line of lines) {
      totalDebit = roundMoney(totalDebit + parseMoney(line.credit));
      totalCredit = roundMoney(totalCredit + parseMoney(line.debit));
    }

    const [reversal] = await ctx.db
      .insert(accountingJournalEntry)
      .values({
        entry_type: "reversal",
        is_advance: existing.is_advance,
        narration: `Reversal of ${id}`,
        posting_date: existing.posting_date,
        reference_id: id,
        reference_type: "Journal Entry",
        reverses: id,
        status: "draft",
        total_credit: toMoney(totalCredit),
        total_debit: toMoney(totalDebit),
      })
      .returning();

    if (!reversal) {
      throw new Error("Failed to create reversal entry.");
    }

    await ctx.db.insert(accountingJournalLine).values(
      lines.map((line) => ({
        account_id: line.account_id,
        credit: line.debit,
        debit: line.credit,
        is_advance: line.is_advance,
        journal_id: reversal.id,
        party_id: line.party_id,
        party_type: line.party_type,
        reference_id: line.reference_id,
        reference_type: line.reference_type,
      })),
    );

    await ctx.db
      .update(accountingJournalEntry)
      .set({ reversed_by: reversal.id, status: "reversed", updated_at: new Date() })
      .where(eq(accountingJournalEntry.id, id));

    const row = assertUpdated(reversal, "Reversal entry");

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.REVERSED,
        crudAction: "update",
        entityId: id,
        entityType: AUDIT_ENTITY_TYPE.JOURNAL,
        newState: { reversedBy: reversal.id },
      });
      await ctx.pubsub.publish(JOURNAL_EVENTS.REVERSED, { journalId: id });
    });

    return row;
  });
