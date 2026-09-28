import { accountingAsset } from "#/db-schemas/asset";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { assertUpdated } from "#/workflows/utils";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, string } from "valibot";

const InputSchema = object({ id: string() });

export const cancelAsset = Workflow.name("accounting.asset.cancel")
  .input(InputSchema)
  .handler(async ({ id }, ctx) => {
    const [existing] = await ctx.db
      .select()
      .from(accountingAsset)
      .where(eq(accountingAsset.id, id))
      .limit(1);
    if (!existing) {
      throw new Error(`Asset "${id}" not found.`);
    }
    if (existing.status !== "draft") {
      throw new Error(
        "Only draft assets can be cancelled. Unwind depreciation and disposal first.",
      );
    }
    const [updated] = await ctx.db
      .update(accountingAsset)
      .set({ status: "cancelled", updated_at: new Date() })
      .where(eq(accountingAsset.id, id))
      .returning();
    const row = assertUpdated(updated, `Asset "${id}"`);
    await ctx.step.run("audit", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.CANCELLED,
        crudAction: "update",
        entityId: id,
        entityType: AUDIT_ENTITY_TYPE.ASSET,
        newState: { status: "cancelled" },
      });
    });
    return row;
  });
