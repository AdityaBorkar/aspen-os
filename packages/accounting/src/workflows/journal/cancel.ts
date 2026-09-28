import { accountingJournalEntry } from "#/db-schemas/chart";
import { JOURNAL_EVENTS } from "#/pubsub";
import { reverseGlEntries } from "#/services/gl-service";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { assertUpdated } from "#/workflows/utils";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, string } from "valibot";

const InputSchema = object({ id: string() });

export const cancelJournalEntry = Workflow.name("accounting.journal.cancel")
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
    if (existing.status === "cancelled") {
      return existing;
    }
    if (existing.status !== "draft" && existing.status !== "submitted") {
      throw new Error("Only draft or submitted journal entries can be cancelled.");
    }

    const fiscalYear = existing.fiscal_year ?? "unfiled";
    const postingDate = existing.posting_date;

    await ctx.db.transaction(async (tx) => {
      if (existing.status === "submitted") {
        await reverseGlEntries({
          db: tx,
          fiscalYear,
          postingDate,
          voucherId: id,
          voucherType: "Journal Entry",
        });
      }
      await tx
        .update(accountingJournalEntry)
        .set({ status: "cancelled", updated_at: new Date() })
        .where(eq(accountingJournalEntry.id, id));
    });

    const [updated] = await ctx.db
      .select()
      .from(accountingJournalEntry)
      .where(eq(accountingJournalEntry.id, id))
      .limit(1);
    const row = assertUpdated(updated, `Journal entry "${id}"`);

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.CANCELLED,
        crudAction: "update",
        entityId: id,
        entityType: AUDIT_ENTITY_TYPE.JOURNAL,
        newState: { status: "cancelled" },
      });
      await ctx.pubsub.publish(JOURNAL_EVENTS.CANCELLED, { journalId: id });
    });

    return row;
  });
