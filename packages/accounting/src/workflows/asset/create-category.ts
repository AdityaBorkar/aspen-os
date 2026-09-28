import { accountingAssetCategory } from "#/db-schemas/asset";
import { CreateAssetCategorySchema } from "#/schemas/asset";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { toMoney } from "#/utils/money";

import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

const InputSchema = object({ input: CreateAssetCategorySchema });

export const createAssetCategory = Workflow.name("accounting.asset-category.create")
  .input(InputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CreateAssetCategorySchema, input);
    const [row] = await ctx.db
      .insert(accountingAssetCategory)
      .values({
        accumulated_account: parsed.accumulatedAccount ?? null,
        depreciation_account: parsed.depreciationAccount ?? null,
        depreciation_method: parsed.depreciationMethod,
        frequency: parsed.frequency ?? "yearly",
        name: parsed.name,
        residual_value: toMoney(parsed.residualValue ?? 0),
        useful_life_years: Math.trunc(parsed.usefulLifeYears ?? 5),
      })
      .returning();
    if (!row) {
      throw new Error("Failed to create asset category.");
    }
    await ctx.step.run("audit", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.CREATED,
        crudAction: "create",
        entityId: row.id,
        entityType: AUDIT_ENTITY_TYPE.ASSET_CATEGORY,
        newState: { name: row.name },
      });
    });
    return row;
  });
