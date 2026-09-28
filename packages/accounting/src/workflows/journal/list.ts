import { accountingJournalEntry } from "#/db-schemas/chart";
import { JournalFiltersSchema } from "#/schemas/chart";

import { Workflow } from "@aspen-os/platform/server";
import { and, desc, eq, gte, lte } from "drizzle-orm";
import type { SQL } from "drizzle-orm";

export const listJournalEntries = Workflow.name("accounting.journal.list")
  .input(JournalFiltersSchema)
  .handler(async (input, ctx) =>
    ctx.step.run("query", async () => {
      const conditions: SQL[] = [];
      if (input.status) {
        conditions.push(eq(accountingJournalEntry.status, input.status));
      }
      if (input.entryType) {
        conditions.push(eq(accountingJournalEntry.entry_type, input.entryType));
      }
      if (input.fromDate) {
        conditions.push(gte(accountingJournalEntry.posting_date, input.fromDate));
      }
      if (input.toDate) {
        conditions.push(lte(accountingJournalEntry.posting_date, input.toDate));
      }
      return ctx.db
        .select()
        .from(accountingJournalEntry)
        .where(and(...conditions))
        .orderBy(desc(accountingJournalEntry.posting_date));
    }),
  );
