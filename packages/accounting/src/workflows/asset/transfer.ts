import { accountingAsset, accountingAssetLocation } from "#/db-schemas/asset";
import type { AssetTransferRecord } from "#/db-schemas/asset";
import { ASSET_EVENTS } from "#/pubsub";
import { TransferAssetSchema } from "#/schemas/asset";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { assertUpdated } from "#/workflows/utils";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, parse, string } from "valibot";

const InputSchema = object({ id: string(), transfer: TransferAssetSchema });

export const transferAsset = Workflow.name("accounting.asset.transfer")
  .input(InputSchema)
  .handler(async ({ id, transfer }, ctx) => {
    const parsed = parse(TransferAssetSchema, transfer);
    const [asset] = await ctx.db
      .select()
      .from(accountingAsset)
      .where(eq(accountingAsset.id, id))
      .limit(1);
    if (!asset) {
      throw new Error(`Asset "${id}" not found.`);
    }
    if (asset.status === "sold" || asset.status === "scrapped" || asset.status === "cancelled") {
      throw new Error("Disposed or cancelled assets cannot be transferred.");
    }
    const [location] = await ctx.db
      .select()
      .from(accountingAssetLocation)
      .where(eq(accountingAssetLocation.id, parsed.toLocationId))
      .limit(1);
    if (!location) {
      throw new Error(`Asset location "${parsed.toLocationId}" not found.`);
    }
    if (asset.location_id === parsed.toLocationId) {
      throw new Error("Asset is already at this location.");
    }

    const record: AssetTransferRecord = {
      at: new Date().toISOString(),
      fromLocationId: asset.location_id,
      note: parsed.note ?? undefined,
      toLocationId: parsed.toLocationId,
    };
    const history = [...(asset.transfer_history ?? []), record];

    const [updated] = await ctx.db
      .update(accountingAsset)
      .set({ location_id: parsed.toLocationId, transfer_history: history, updated_at: new Date() })
      .where(eq(accountingAsset.id, id))
      .returning();

    const row = assertUpdated(updated, `Asset "${id}"`);

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.TRANSFERRED,
        crudAction: "update",
        entityId: id,
        entityType: AUDIT_ENTITY_TYPE.ASSET,
        newState: { locationId: parsed.toLocationId },
        previousState: { locationId: asset.location_id },
      });
      await ctx.pubsub.publish(ASSET_EVENTS.TRANSFERRED, { assetId: id });
    });

    return row;
  });
