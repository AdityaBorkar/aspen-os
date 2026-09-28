import { accountingAssetLocation } from "#/db-schemas/asset";
import { CreateAssetLocationSchema } from "#/schemas/asset";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";

import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

const InputSchema = object({ input: CreateAssetLocationSchema });

export const createAssetLocation = Workflow.name("accounting.asset-location.create")
  .input(InputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CreateAssetLocationSchema, input);
    const [row] = await ctx.db
      .insert(accountingAssetLocation)
      .values({ address: parsed.address ?? null, name: parsed.name })
      .returning();
    if (!row) {
      throw new Error("Failed to create asset location.");
    }
    await ctx.step.run("audit", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.CREATED,
        crudAction: "create",
        entityId: row.id,
        entityType: AUDIT_ENTITY_TYPE.ASSET_LOCATION,
        newState: { name: row.name },
      });
    });
    return row;
  });
