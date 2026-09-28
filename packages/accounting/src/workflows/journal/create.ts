import { accountingJournalEntry, accountingJournalLine } from "#/db-schemas/chart";
import { CreateJournalEntrySchema } from "#/schemas/chart";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE, PARTY_TYPE } from "#/utils/constants";
import { assertBalanced, roundMoney, toMoney } from "#/utils/money";

import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

const InputSchema = object({ input: CreateJournalEntrySchema });

function toPartyType(value: string | null | undefined): "customer" | "vendor" | null {
  if (value === PARTY_TYPE.CUSTOMER) {
    return PARTY_TYPE.CUSTOMER;
  }
  if (value === PARTY_TYPE.VENDOR) {
    return PARTY_TYPE.VENDOR;
  }
  return null;
}

export const createJournalEntry = Workflow.name("accounting.journal.create")
  .input(InputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CreateJournalEntrySchema, input);

    let totalDebit = 0;
    let totalCredit = 0;
    for (const line of parsed.lines) {
      const debit = line.debit ?? 0;
      const credit = line.credit ?? 0;
      if (debit < 0 || credit < 0) {
        throw new Error("Journal line amounts cannot be negative.");
      }
      if (debit > 0 && credit > 0) {
        throw new Error("Journal line must have debit or credit, not both.");
      }
      if (debit === 0 && credit === 0) {
        throw new Error("Journal line must have a debit or credit amount.");
      }
      if (line.referenceType === "Payment Entry") {
        throw new Error("Journal lines must never reference a Payment Entry.");
      }
      totalDebit = roundMoney(totalDebit + debit);
      totalCredit = roundMoney(totalCredit + credit);
    }
    assertBalanced(totalDebit, totalCredit);

    const [row] = await ctx.db
      .insert(accountingJournalEntry)
      .values({
        entry_type: parsed.entryType ?? "journal",
        is_advance: parsed.isAdvance ?? false,
        narration: parsed.narration ?? null,
        posting_date: parsed.postingDate,
        reference_id: parsed.referenceId ?? null,
        reference_type: parsed.referenceType ?? null,
        status: "draft",
        total_credit: toMoney(totalCredit),
        total_debit: toMoney(totalDebit),
      })
      .returning();

    if (!row) {
      throw new Error("Failed to create journal entry.");
    }

    await ctx.db.insert(accountingJournalLine).values(
      parsed.lines.map((line) => ({
        account_id: line.accountId,
        credit: toMoney(roundMoney(line.credit ?? 0)),
        debit: toMoney(roundMoney(line.debit ?? 0)),
        is_advance: line.isAdvance ?? false,
        journal_id: row.id,
        party_id: line.partyId ?? null,
        party_type: toPartyType(line.partyType),
        reference_id: line.referenceId ?? null,
        reference_type: line.referenceType ?? null,
      })),
    );

    await ctx.step.run("audit", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.CREATED,
        crudAction: "create",
        entityId: row.id,
        entityType: AUDIT_ENTITY_TYPE.JOURNAL,
        newState: { entryType: row.entry_type, status: row.status },
      });
    });

    return row;
  });
