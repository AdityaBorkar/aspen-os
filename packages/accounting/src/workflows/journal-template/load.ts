import { accountingJournalEntry, accountingJournalLine } from "#/db-schemas/chart";
import { accountingJournalTemplate } from "#/db-schemas/settings";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE, JOURNAL_TYPE } from "#/utils/constants";
import { roundMoney, toMoney } from "#/utils/money";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { minLength, object, pipe, string } from "valibot";

const InputSchema = object({
  postingDate: pipe(string(), minLength(1, "postingDate is required")),
  templateId: pipe(string(), minLength(1, "templateId is required")),
});

function toJournalType(value: string): (typeof JOURNAL_TYPE)[keyof typeof JOURNAL_TYPE] {
  if (
    value === JOURNAL_TYPE.JOURNAL ||
    value === JOURNAL_TYPE.OPENING ||
    value === JOURNAL_TYPE.WRITE_OFF ||
    value === JOURNAL_TYPE.CONTRA ||
    value === JOURNAL_TYPE.BANK ||
    value === JOURNAL_TYPE.CASH ||
    value === JOURNAL_TYPE.DEPRECIATION ||
    value === JOURNAL_TYPE.REVERSAL
  ) {
    return value;
  }
  return JOURNAL_TYPE.JOURNAL;
}

export const loadJournalTemplate = Workflow.name("accounting.journal-template.load")
  .input(InputSchema)
  .handler(async ({ postingDate, templateId }, ctx) => {
    const [template] = await ctx.db
      .select()
      .from(accountingJournalTemplate)
      .where(eq(accountingJournalTemplate.id, templateId))
      .limit(1);
    if (!template) {
      throw new Error(`Journal template "${templateId}" not found.`);
    }
    const lines = template.lines ?? [];
    if (lines.length < 2) {
      throw new Error("Journal template requires at least two lines.");
    }
    let totalDebit = 0;
    let totalCredit = 0;
    for (const line of lines) {
      totalDebit = roundMoney(totalDebit + (line.debit ?? 0));
      totalCredit = roundMoney(totalCredit + (line.credit ?? 0));
    }
    const [entry] = await ctx.db
      .insert(accountingJournalEntry)
      .values({
        entry_type: toJournalType(template.entry_type ?? "journal"),
        narration: template.narration,
        posting_date: postingDate,
        status: "draft",
        total_credit: toMoney(totalCredit),
        total_debit: toMoney(totalDebit),
      })
      .returning();
    if (!entry) {
      throw new Error("Failed to load journal template.");
    }
    await ctx.db.insert(accountingJournalLine).values(
      lines.map((line) => ({
        account_id: line.accountId,
        credit: toMoney(line.credit ?? 0),
        debit: toMoney(line.debit ?? 0),
        is_advance: false,
        journal_id: entry.id,
        party_id: null,
        party_type: null,
        reference_id: null,
        reference_type: null,
      })),
    );
    await ctx.step.run("audit", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.CREATED,
        crudAction: "create",
        entityId: entry.id,
        entityType: AUDIT_ENTITY_TYPE.JOURNAL,
        newState: { templateId },
      });
    });
    return entry;
  });
