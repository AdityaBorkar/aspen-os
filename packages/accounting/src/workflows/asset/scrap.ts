import { accountingAsset } from "#/db-schemas/asset";
import { ASSET_EVENTS } from "#/pubsub";
import { DisposeAssetSchema } from "#/schemas/asset";
import { assertPeriodOpen } from "#/services/fiscal-service";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { assertUpdated } from "#/workflows/utils";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, parse, string } from "valibot";

const InputSchema = object({ disposal: DisposeAssetSchema, id: string() });

export const scrapAsset = Workflow.name("accounting.asset.scrap")
  .input(InputSchema)
  .handler(async ({ disposal, id }, ctx) => {
    const parsed = parse(DisposeAssetSchema, disposal);
    await assertPeriodOpen({ db: ctx.db, postingDate: parsed.disposalDate });
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
    const [updated] = await ctx.db
      .update(accountingAsset)
      .set({ status: "scrapped", updated_at: new Date() })
      .where(eq(accountingAsset.id, id))
      .returning();
    const row = assertUpdated(updated, `Asset "${id}"`);
    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.DISPOSED,
        crudAction: "update",
        entityId: id,
        entityType: AUDIT_ENTITY_TYPE.ASSET,
        newState: { disposalDate: parsed.disposalDate, status: "scrapped" },
      });
      await ctx.pubsub.publish(ASSET_EVENTS.DISPOSED, { assetId: id });
    });
    return row;
  });
