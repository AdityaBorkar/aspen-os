import { accountingAsset } from "#/db-schemas/asset";
import type { AssetRepairRecord } from "#/db-schemas/asset";
import { RepairAssetSchema } from "#/schemas/asset";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { toMoney } from "#/utils/money";
import { assertUpdated } from "#/workflows/utils";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, parse, string } from "valibot";

const InputSchema = object({ id: string(), repair: RepairAssetSchema });

export const logAssetRepair = Workflow.name("accounting.asset.log-repair")
  .input(InputSchema)
  .handler(async ({ id, repair }, ctx) => {
    const parsed = parse(RepairAssetSchema, repair);
    const [asset] = await ctx.db
      .select()
      .from(accountingAsset)
      .where(eq(accountingAsset.id, id))
      .limit(1);
    if (!asset) {
      throw new Error(`Asset "${id}" not found.`);
    }
    const record: AssetRepairRecord = {
      at: new Date().toISOString(),
      cost: toMoney(parsed.cost ?? 0),
      note: parsed.note ?? undefined,
    };
    const log = [...(asset.repair_log ?? []), record];
    const [updated] = await ctx.db
      .update(accountingAsset)
      .set({ repair_log: log, status: "in_maintenance", updated_at: new Date() })
      .where(eq(accountingAsset.id, id))
      .returning();
    const row = assertUpdated(updated, `Asset "${id}"`);
    await ctx.step.run("audit", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.UPDATED,
        crudAction: "update",
        entityId: id,
        entityType: AUDIT_ENTITY_TYPE.ASSET,
        newState: { status: "in_maintenance" },
      });
    });
    return row;
  });
