import {
  accountingAccount,
  accountingJournalEntry,
  accountingJournalLine,
} from "#/db-schemas/chart";
import { JOURNAL_EVENTS } from "#/pubsub";
import { assertPeriodOpen } from "#/services/fiscal-service";
import { postGlEntries } from "#/services/gl-service";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { GL_TOLERANCE, parseMoney, roundMoney } from "#/utils/money";
import { assertUpdated } from "#/workflows/utils";

import { Workflow } from "@aspen-os/platform/server";
import { eq, inArray } from "drizzle-orm";
import { object, string } from "valibot";

const InputSchema = object({ id: string() });

export const submitJournalEntry = Workflow.name("accounting.journal.submit")
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
    if (existing.status !== "draft") {
      throw new Error("Only draft journal entries can be submitted.");
    }

    const year = await assertPeriodOpen({ db: ctx.db, postingDate: existing.posting_date });

    const lines = await ctx.db
      .select()
      .from(accountingJournalLine)
      .where(eq(accountingJournalLine.journal_id, id));

    if (lines.length < 2) {
      throw new Error("Journal entry requires at least two lines.");
    }

    const accountIds = [...new Set(lines.map((line) => line.account_id))];
    const accounts = await ctx.db
      .select()
      .from(accountingAccount)
      .where(inArray(accountingAccount.id, accountIds));
    const accountsById = new Map(accounts.map((account) => [account.id, account]));

    let totalDebit = 0;
    let totalCredit = 0;
    for (const line of lines) {
      const account = accountsById.get(line.account_id);
      if (!account) {
        throw new Error(`Account "${line.account_id}" not found.`);
      }
      if (account.is_group) {
        throw new Error(`Group account "${account.name}" cannot post. Use a ledger.`);
      }
      if (account.is_disabled) {
        throw new Error(`Account "${account.name}" is disabled.`);
      }
      totalDebit = roundMoney(totalDebit + parseMoney(line.debit));
      totalCredit = roundMoney(totalCredit + parseMoney(line.credit));
    }

    if (Math.abs(totalDebit - totalCredit) > GL_TOLERANCE) {
      throw new Error("Journal entry is unbalanced.");
    }

    await ctx.db.transaction(async (tx) => {
      await tx
        .update(accountingJournalEntry)
        .set({ fiscal_year: year.name, status: "submitted", updated_at: new Date() })
        .where(eq(accountingJournalEntry.id, id));
      await postGlEntries({
        db: tx,
        fiscalYear: year.name,
        postingDate: existing.posting_date,
        rows: lines.map((line) => ({
          accountId: line.account_id,
          credit: parseMoney(line.credit),
          debit: parseMoney(line.debit),
          partyId: line.party_id,
          partyType: line.party_type,
        })),
        voucherId: id,
        voucherType: "Journal Entry",
      });
    });

    const [updated] = await ctx.db
      .select()
      .from(accountingJournalEntry)
      .where(eq(accountingJournalEntry.id, id))
      .limit(1);
    const row = assertUpdated(updated, `Journal entry "${id}"`);

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.POSTED,
        crudAction: "update",
        entityId: id,
        entityType: AUDIT_ENTITY_TYPE.JOURNAL,
        newState: { status: "submitted" },
      });
      await ctx.pubsub.publish(JOURNAL_EVENTS.POSTED, { journalId: id });
    });

    return row;
  });
