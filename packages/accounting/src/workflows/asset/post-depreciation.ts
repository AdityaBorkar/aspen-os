import {
  accountingAsset,
  accountingAssetCategory,
  accountingDepreciationSchedule,
} from "#/db-schemas/asset";
import {
  accountingJournalEntry as journalEntryTable,
  accountingJournalLine as journalLineTable,
} from "#/db-schemas/chart";
import { ASSET_EVENTS, JOURNAL_EVENTS } from "#/pubsub";
import { assertPeriodOpen } from "#/services/fiscal-service";
import { postGlEntries } from "#/services/gl-service";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { parseMoney, roundMoney, toMoney, todayDateOnly } from "#/utils/money";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq, lte } from "drizzle-orm";
import { object, optional, string } from "valibot";

const InputSchema = object({ asOf: optional(string()), assetId: optional(string()) });

export const postDueDepreciation = Workflow.name("accounting.asset.post-depreciation")
  .input(InputSchema)
  .handler(async ({ assetId, asOf }, ctx) => {
    const cutoff = asOf ?? todayDateOnly();
    const conditions = [
      lte(accountingDepreciationSchedule.expected_date, cutoff),
      eq(accountingDepreciationSchedule.status, "scheduled"),
    ];
    if (assetId) {
      conditions.push(eq(accountingDepreciationSchedule.asset_id, assetId));
    }
    const due = await ctx.db
      .select()
      .from(accountingDepreciationSchedule)
      .where(and(...conditions));

    const posted: { journalId: string; scheduleId: string }[] = [];

    for (const schedule of due) {
      const [asset] = await ctx.db
        .select()
        .from(accountingAsset)
        .where(eq(accountingAsset.id, schedule.asset_id))
        .limit(1);
      if (!asset) {
        continue;
      }
      if (asset.status === "sold" || asset.status === "scrapped" || asset.status === "cancelled") {
        continue;
      }
      const [category] = await ctx.db
        .select()
        .from(accountingAssetCategory)
        .where(eq(accountingAssetCategory.id, asset.category_id))
        .limit(1);
      const expenseAccount = category?.depreciation_account;
      const accumulatedAccount = category?.accumulated_account;
      if (!expenseAccount || !accumulatedAccount) {
        throw new Error(`Asset category "${asset.category_id}" lacks depreciation ledgers.`);
      }

      const year = await assertPeriodOpen({ db: ctx.db, postingDate: schedule.expected_date });
      const amount = parseMoney(schedule.amount);

      const [journal] = await ctx.db
        .insert(journalEntryTable)
        .values({
          entry_type: "depreciation",
          fiscal_year: year.name,
          is_advance: false,
          narration: `Depreciation for asset ${asset.id}`,
          posting_date: schedule.expected_date,
          reference_id: asset.id,
          reference_type: "Asset",
          status: "submitted",
          total_credit: toMoney(amount),
          total_debit: toMoney(amount),
        })
        .returning();
      if (!journal) {
        throw new Error("Failed to create depreciation journal.");
      }

      await ctx.db.insert(journalLineTable).values([
        {
          account_id: expenseAccount,
          credit: "0",
          debit: toMoney(amount),
          is_advance: false,
          journal_id: journal.id,
          party_id: null,
          party_type: null,
          reference_id: asset.id,
          reference_type: "Asset",
        },
        {
          account_id: accumulatedAccount,
          credit: toMoney(amount),
          debit: "0",
          is_advance: false,
          journal_id: journal.id,
          party_id: null,
          party_type: null,
          reference_id: asset.id,
          reference_type: "Asset",
        },
      ]);

      await postGlEntries({
        db: ctx.db,
        fiscalYear: year.name,
        postingDate: schedule.expected_date,
        rows: [
          { accountId: expenseAccount, debit: amount },
          { accountId: accumulatedAccount, credit: amount },
        ],
        voucherId: journal.id,
        voucherType: "Journal Entry",
      });

      await ctx.db
        .update(accountingDepreciationSchedule)
        .set({ journal_id: journal.id, status: "posted" })
        .where(eq(accountingDepreciationSchedule.id, schedule.id));

      const nextAccumulated = roundMoney(parseMoney(asset.accumulated_depreciation) + amount);
      const nextBook = roundMoney(parseMoney(asset.gross_value) - nextAccumulated);
      const remaining = await ctx.db
        .select({ id: accountingDepreciationSchedule.id })
        .from(accountingDepreciationSchedule)
        .where(
          and(
            eq(accountingDepreciationSchedule.asset_id, asset.id),
            eq(accountingDepreciationSchedule.status, "scheduled"),
          ),
        )
        .limit(1);
      const nextStatus = remaining.length === 0 ? "fully_depreciated" : "partly_depreciated";

      await ctx.db
        .update(accountingAsset)
        .set({
          accumulated_depreciation: toMoney(nextAccumulated),
          book_value: toMoney(Math.max(0, nextBook)),
          status: nextStatus,
          updated_at: new Date(),
        })
        .where(eq(accountingAsset.id, asset.id));

      await ctx.audit.write({
        action: AUDIT_ACTION.DEPRECIATED,
        crudAction: "update",
        entityId: asset.id,
        entityType: AUDIT_ENTITY_TYPE.ASSET,
        newState: { amount, scheduleId: schedule.id },
      });
      await ctx.pubsub.publish(ASSET_EVENTS.DEPRECIATED, {
        assetId: asset.id,
        journalId: journal.id,
        scheduleId: schedule.id,
      });
      await ctx.pubsub.publish(JOURNAL_EVENTS.POSTED, { journalId: journal.id });

      posted.push({ journalId: journal.id, scheduleId: schedule.id });
    }

    return posted;
  });
