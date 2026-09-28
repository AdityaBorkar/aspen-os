import { accountingAsset, accountingAssetCategory } from "#/db-schemas/asset";
import { ASSET_EVENTS } from "#/pubsub";
import { DisposeAssetSchema } from "#/schemas/asset";
import { resolveControlAccount } from "#/services/accounts-service";
import { assertPeriodOpen } from "#/services/fiscal-service";
import { postGlEntries } from "#/services/gl-service";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { parseMoney, roundMoney } from "#/utils/money";
import { assertUpdated } from "#/workflows/utils";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, parse, string } from "valibot";

const SellInputSchema = object({ disposal: DisposeAssetSchema, id: string() });

export const sellAsset = Workflow.name("accounting.asset.sell")
  .input(SellInputSchema)
  .handler(async ({ disposal, id }, ctx) => {
    const parsed = parse(DisposeAssetSchema, disposal);
    const [asset] = await ctx.db
      .select()
      .from(accountingAsset)
      .where(eq(accountingAsset.id, id))
      .limit(1);
    if (!asset) {
      throw new Error(`Asset "${id}" not found.`);
    }
    if (asset.status === "sold" || asset.status === "scrapped" || asset.status === "cancelled") {
      throw new Error("Asset is already disposed.");
    }
    const year = await assertPeriodOpen({ db: ctx.db, postingDate: parsed.disposalDate });

    const gross = roundMoney(parseMoney(asset.gross_value));
    const accumulated = roundMoney(parseMoney(asset.accumulated_depreciation));
    const bookValue = roundMoney(parseMoney(asset.book_value));
    const proceeds = roundMoney(parsed.proceeds ?? 0);

    const cashAccount =
      parsed.disposalAccount ??
      (await resolveControlAccount({ accountType: "bank", db: ctx.db, label: "bank" }));
    const fixedAssetAccount = await resolveControlAccount({
      accountType: "fixed_asset",
      db: ctx.db,
      label: "fixed asset",
    });
    const accumulatedAccount =
      (
        await ctx.db
          .select()
          .from(accountingAssetCategory)
          .where(eq(accountingAssetCategory.id, asset.category_id))
          .limit(1)
      )[0]?.accumulated_account ?? fixedAssetAccount;
    const gainAccount = await resolveControlAccount({
      accountType: "income",
      db: ctx.db,
      label: "income",
    });
    const lossAccount = await resolveControlAccount({
      accountType: "expense",
      db: ctx.db,
      label: "expense",
    });

    const diff = roundMoney(proceeds - bookValue);

    await ctx.db.transaction(async (tx) => {
      const rows: { accountId: string; credit?: number; debit?: number }[] = [];
      if (proceeds > 0) {
        rows.push({ accountId: cashAccount, debit: proceeds });
      }
      if (accumulated > 0) {
        rows.push({ accountId: accumulatedAccount, debit: accumulated });
      }
      rows.push({ accountId: fixedAssetAccount, credit: gross });
      if (diff > 0.005) {
        rows.push({ accountId: gainAccount, credit: diff });
      } else if (diff < -0.005) {
        rows.push({ accountId: lossAccount, debit: Math.abs(diff) });
      }

      await postGlEntries({
        db: tx,
        fiscalYear: year.name,
        postingDate: parsed.disposalDate,
        rows,
        voucherId: id,
        voucherType: "Asset Disposal",
      });
      await tx
        .update(accountingAsset)
        .set({ status: "sold", updated_at: new Date() })
        .where(eq(accountingAsset.id, id));
    });

    const [updated] = await ctx.db
      .select()
      .from(accountingAsset)
      .where(eq(accountingAsset.id, id))
      .limit(1);
    const row = assertUpdated(updated, `Asset "${id}"`);

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.DISPOSED,
        crudAction: "update",
        entityId: id,
        entityType: AUDIT_ENTITY_TYPE.ASSET,
        newState: { proceeds, status: "sold" },
      });
      await ctx.pubsub.publish(ASSET_EVENTS.DISPOSED, { assetId: id });
    });

    return row;
  });
