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
import { and, eq, inArray, lte } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import { object, optional, string } from "valibot";

const InputSchema = object({ asOf: optional(string()), assetId: optional(string()) });

export const postDueDepreciation = Workflow.name("accounting.asset.post-depreciation")
  .input(InputSchema)
  .handler(async ({ assetId, asOf }, ctx) => {
    const cutoff = asOf ?? todayDateOnly();
    const conditions: SQL[] = [
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

    if (due.length === 0) {
      return [];
    }

    const assetIds = [...new Set(due.map((schedule) => schedule.asset_id))];
    const assets = await ctx.db
      .select()
      .from(accountingAsset)
      .where(inArray(accountingAsset.id, assetIds));
    const assetsById = new Map(assets.map((asset) => [asset.id, asset]));

    const categoryIds = [...new Set(assets.map((asset) => asset.category_id))];
    const categories =
      categoryIds.length > 0
        ? await ctx.db
            .select()
            .from(accountingAssetCategory)
            .where(inArray(accountingAssetCategory.id, categoryIds))
        : [];
    const categoriesById = new Map(categories.map((category) => [category.id, category]));

    const scheduledCounts = new Map<string, number>();
    const pending = await ctx.db
      .select({ asset_id: accountingDepreciationSchedule.asset_id })
      .from(accountingDepreciationSchedule)
      .where(
        and(
          inArray(accountingDepreciationSchedule.asset_id, assetIds),
          eq(accountingDepreciationSchedule.status, "scheduled"),
        ),
      );
    for (const row of pending) {
      scheduledCounts.set(row.asset_id, (scheduledCounts.get(row.asset_id) ?? 0) + 1);
    }

    const posted: { journalId: string; scheduleId: string }[] = [];

    for (const schedule of due) {
      const asset = assetsById.get(schedule.asset_id);
      if (!asset) {
        continue;
      }
      if (asset.status === "sold" || asset.status === "scrapped" || asset.status === "cancelled") {
        continue;
      }
      const category = categoriesById.get(asset.category_id);
      const expenseAccount = category?.depreciation_account;
      const accumulatedAccount = category?.accumulated_account;
      if (!expenseAccount || !accumulatedAccount) {
        throw new Error(`Asset category "${asset.category_id}" lacks depreciation ledgers.`);
      }

      const amount = parseMoney(schedule.amount);
      let journalId = "";
      let nextAccumulated = 0;
      let nextBook = 0;
      let nextStatus: "fully_depreciated" | "partly_depreciated" = "partly_depreciated";

      await ctx.db.transaction(async (tx) => {
        const year = await assertPeriodOpen({ db: tx, postingDate: schedule.expected_date });
        const [journal] = await tx
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
        journalId = journal.id;

        await tx.insert(journalLineTable).values([
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
          db: tx,
          fiscalYear: year.name,
          postingDate: schedule.expected_date,
          rows: [
            { accountId: expenseAccount, debit: amount },
            { accountId: accumulatedAccount, credit: amount },
          ],
          voucherId: journal.id,
          voucherType: "Journal Entry",
        });

        await tx
          .update(accountingDepreciationSchedule)
          .set({ journal_id: journal.id, status: "posted" })
          .where(eq(accountingDepreciationSchedule.id, schedule.id));

        nextAccumulated = roundMoney(parseMoney(asset.accumulated_depreciation) + amount);
        nextBook = roundMoney(parseMoney(asset.gross_value) - nextAccumulated);
        const left = (scheduledCounts.get(asset.id) ?? 1) - 1;
        scheduledCounts.set(asset.id, Math.max(0, left));
        nextStatus = left <= 0 ? "fully_depreciated" : "partly_depreciated";

        await tx
          .update(accountingAsset)
          .set({
            accumulated_depreciation: toMoney(nextAccumulated),
            book_value: toMoney(Math.max(0, nextBook)),
            status: nextStatus,
            updated_at: new Date(),
          })
          .where(eq(accountingAsset.id, asset.id));
      });

      const current = assetsById.get(asset.id);
      if (current) {
        assetsById.set(asset.id, {
          ...current,
          accumulated_depreciation: toMoney(nextAccumulated),
          book_value: toMoney(Math.max(0, nextBook)),
          status: nextStatus,
        });
      }

      await ctx.audit.write({
        action: AUDIT_ACTION.DEPRECIATED,
        crudAction: "update",
        entityId: asset.id,
        entityType: AUDIT_ENTITY_TYPE.ASSET,
        newState: { amount, scheduleId: schedule.id },
      });
      await ctx.pubsub.publish(ASSET_EVENTS.DEPRECIATED, {
        assetId: asset.id,
        journalId,
        scheduleId: schedule.id,
      });
      await ctx.pubsub.publish(JOURNAL_EVENTS.POSTED, { journalId });

      posted.push({ journalId, scheduleId: schedule.id });
    }

    return posted;
  });
