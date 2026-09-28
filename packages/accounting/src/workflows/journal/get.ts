import { accountingJournalEntry, accountingJournalLine } from "#/db-schemas/chart";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, string } from "valibot";

const InputSchema = object({ id: string() });

export const getJournalEntry = Workflow.name("accounting.journal.get")
  .input(InputSchema)
  .handler(async ({ id }, ctx) => {
    const [entry] = await ctx.db
      .select()
      .from(accountingJournalEntry)
      .where(eq(accountingJournalEntry.id, id))
      .limit(1);
    if (!entry) {
      throw new Error(`Journal entry "${id}" not found.`);
    }
    const lines = await ctx.db
      .select()
      .from(accountingJournalLine)
      .where(eq(accountingJournalLine.journal_id, id));
    return { entry, lines };
  });
